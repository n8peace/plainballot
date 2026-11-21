import { spawn, type ChildProcess } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdir, readdir } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';

const DEFAULT_URL = 'http://localhost:3000';
const DEV_URL = 'http://localhost:3123';
const DEFAULT_ADDRESS = '1315 10th St, Sacramento, CA 95814';
const STEP_TIMEOUT = 15_000;
// A real lookup can make two 8-second outside calls in a row (Census, then election data).
const BALLOT_TIMEOUT = 30_000;

// ownServer: no --url was given, so the script runs this checkout's own site.
export type VerifyOptions = { url: string; address: string; out: string; ownServer: boolean };

export function parseVerifyArgs(argv: string[]): VerifyOptions {
  const options: VerifyOptions = {
    url: DEFAULT_URL,
    address: DEFAULT_ADDRESS,
    out: path.join(tmpdir(), 'plainballot-verify'),
    ownServer: true,
  };
  const keys = { '--url': 'url', '--address': 'address', '--out': 'out' } as const;
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i] as keyof typeof keys;
    const key = keys[flag];
    if (!key) throw new Error(`Unknown argument: ${argv[i]}`);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    options[key] = value;
    if (key === 'url') options.ownServer = false;
  }
  let parsed: URL;
  try {
    parsed = new URL(options.url);
  } catch {
    throw new Error(`Invalid URL: ${options.url}`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`URL must use http or https: ${options.url}`);
  options.url = parsed.href.replace(/\/$/, '');
  if (!options.address.trim()) throw new Error('Address must not be empty');
  if (!options.out.trim()) throw new Error('Output folder must not be empty');
  return options;
}

type Result = 'PASS' | 'FAIL' | 'SKIP';
type StepOutcome = { result?: Result; evidence: string };

const oneLine = (value: unknown) => String(value).replace(/\s+/g, ' ').trim();
const originOf = (base: string) => new URL(base).origin;

async function answers(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1_500) });
    return true;
  } catch {
    return false;
  }
}

async function waitForServer(url: string, process: ChildProcess, output: string[]): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`next dev exited with code ${process.exitCode}: ${output.join(' ')}`);
    if (await answers(url)) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`next dev did not answer at ${url} within 20s: ${output.join(' ')}`);
}

async function stopServer(process: ChildProcess): Promise<void> {
  if (!process.pid || process.exitCode !== null) return;
  try {
    process.kill('SIGTERM');
  } catch {
    return;
  }
  await Promise.race([
    new Promise<void>((resolve) => process.once('exit', () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (process.exitCode === null) process.kill('SIGKILL');
}

async function cachedChromiums(): Promise<string[]> {
  const root = path.join(homedir(), 'Library', 'Caches', 'ms-playwright');
  let entries: string[];
  try {
    entries = await readdir(root, { recursive: true });
  } catch {
    return [];
  }
  const candidates = entries
    .filter((entry) => /(?:Chromium\.app\/Contents\/MacOS\/Chromium|chrome-headless-shell|chrome)$/.test(entry))
    .map((entry) => path.join(root, entry))
    .sort((a, b) => {
      const revision = (value: string) => Number(value.match(/(?:chromium|chromium_headless_shell)-(\d+)/)?.[1] ?? 0);
      return revision(b) - revision(a) || Number(b.includes('Chromium.app')) - Number(a.includes('Chromium.app'));
    });
  const executable: string[] = [];
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      executable.push(candidate);
    } catch {
      // Ignore incomplete cache entries.
    }
  }
  return [...new Set(executable)];
}

async function launchBrowser(): Promise<{ browser: Browser; evidence: string }> {
  try {
    return { browser: await chromium.launch({ channel: 'chrome' }), evidence: 'Google Chrome (channel: chrome)' };
  } catch (chromeError) {
    const candidates = await cachedChromiums();
    const fallbackErrors: string[] = [];
    for (const executablePath of candidates) {
      try {
        return { browser: await chromium.launch({ executablePath }), evidence: `cached Chromium at ${executablePath}` };
      } catch (error) {
        fallbackErrors.push(`${executablePath}: ${oneLine(error)}`);
      }
    }
    const fallback = fallbackErrors.length ? fallbackErrors.join(' | ') : 'no executable cached Chromium found';
    throw new Error(`Google Chrome failed: ${oneLine(chromeError)}; fallback failed: ${fallback}`);
  }
}

function watchPage(page: Page, base: string) {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const origin = originOf(base);
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    // The address box cancels its own lookup when the voter keeps typing or submits. A
    // cancelled request is the page working, not failing.
    const aborted = /ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(request.failure()?.errorText ?? '');
    if (aborted && request.method() === 'GET' && new URL(request.url()).pathname === '/api/address') return;
    if (new URL(request.url()).origin === origin) failedRequests.push(`${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'failed'})`);
  });
  return { consoleErrors, failedRequests };
}

async function loadHome(page: Page, base: string): Promise<string> {
  // ?team=1 marks this browser as ours, so these visits and ballot pulls never count as voters.
  const response = await page.goto(`${base}/?team=1`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT });
  await page.waitForLoadState('networkidle', { timeout: STEP_TIMEOUT });
  if (response?.status() !== 200) throw new Error(`home returned ${response?.status() ?? 'no response'}`);
  return `HTTP ${response.status()}`;
}

type BallotResponse = { sample?: boolean; notice?: string };

async function pullBallot(page: Page, address: string): Promise<BallotResponse> {
  const input = page.getByPlaceholder('Start typing your street address').first();
  await input.fill(address, { timeout: STEP_TIMEOUT });
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/ballot') && response.request().method() === 'POST',
    { timeout: BALLOT_TIMEOUT },
  );
  await page.getByRole('button', { name: /See my ballot|Find my ballot/ }).first().click();
  const response = await responsePromise;
  const data = await response.json() as BallotResponse & { error?: string };
  if (response.status() !== 200) throw new Error(`ballot API returned ${response.status()}: ${data.error ?? 'unknown error'}`);
  await page.locator('.pp-edition').waitFor({ state: 'visible', timeout: BALLOT_TIMEOUT });
  await page.waitForLoadState('networkidle', { timeout: STEP_TIMEOUT });
  return data;
}

async function checkBallot(page: Page): Promise<{ races: number; candidates: number; quotes: number }> {
  const races = page.locator('article.pp-story:has(.pp-table)');
  const raceCount = await races.count();
  if (raceCount < 1) throw new Error('no race rendered');
  let candidates = 0;
  for (let i = 0; i < raceCount; i += 1) {
    const count = await races.nth(i).locator('.pp-cand').count();
    if (count < 1) throw new Error(`race ${i + 1} has no candidate row`);
    candidates += count;
  }
  const quoteControls = page.locator('article.pp-story .pp-stance');
  if (await quoteControls.count() < 1) throw new Error('no quote or source control rendered');
  await quoteControls.first().click();
  await page.locator('article.pp-story .pp-quote blockquote').first().waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
  const quotes = await page.locator('article.pp-story .pp-quote blockquote').count();
  return { races: raceCount, candidates, quotes };
}

async function findRacePath(context: BrowserContext, base: string): Promise<string> {
  const response = await context.request.get(`${base}/sitemap.xml`, { timeout: STEP_TIMEOUT });
  if (response.status() !== 200) throw new Error(`/sitemap.xml returned ${response.status()}`);
  const match = (await response.text()).match(/<loc>(?:https?:\/\/[^<]+)?(\/r\/[^<]+)<\/loc>/);
  if (!match) throw new Error('/sitemap.xml contains no /r/ race link');
  return match[1];
}

async function main(): Promise<void> {
  let options: VerifyOptions;
  try {
    options = parseVerifyArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`FAIL args ${oneLine(error)}`);
    process.exitCode = 1;
    return;
  }

  let server: ChildProcess | undefined;
  let browser: Browser | undefined;
  let base = options.url;
  const failures: string[] = [];
  const report = async (label: string, run: () => Promise<StepOutcome>) => {
    try {
      const outcome = await run();
      const result = outcome.result ?? 'PASS';
      console.log(`${result} ${label} ${oneLine(outcome.evidence)}`);
      if (result === 'FAIL') failures.push(label);
    } catch (error) {
      console.log(`FAIL ${label} ${oneLine(error)}`);
      failures.push(label);
    }
  };

  try {
    // With no --url, always run this checkout's own site. A server already on port 3000 may be
    // an older copy or another project, which would check the wrong thing.
    if (options.ownServer) {
      if (await answers(DEV_URL)) throw new Error(`port 3123 is already in use; stop that server or pass --url`);
      const next = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
      const serverOutput: string[] = [];
      server = spawn(process.execPath, [next, 'dev', '--hostname', '127.0.0.1', '--port', '3123'], {
        cwd: process.cwd(),
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const remember = (chunk: Buffer) => {
        serverOutput.push(oneLine(chunk));
        if (serverOutput.length > 6) serverOutput.shift();
      };
      server.stdout?.on('data', remember);
      server.stderr?.on('data', remember);
      await waitForServer(DEV_URL, server, serverOutput);
      base = DEV_URL;
      console.log(`PASS server started next dev at ${base}`);
    } else {
      console.log(`PASS server using --url ${base}`);
    }
    const title = await fetch(base).then((r) => r.text()).then((t) => /<title>[^<]*Plain Ballot/i.test(t)).catch(() => false);
    if (!title) throw new Error(`${base} is not Plain Ballot (no "Plain Ballot" in the page title)`);

    const launched = await launchBrowser();
    browser = launched.browser;
    console.log(`PASS browser launched ${launched.evidence}`);
    await mkdir(options.out, { recursive: true });

    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await desktop.newPage();
    const homeWatch = watchPage(page, base);

    await report('a home', async () => {
      const http = await loadHome(page, base);
      if (homeWatch.consoleErrors.length) throw new Error(`console errors: ${homeWatch.consoleErrors.join(' | ')}`);
      if (homeWatch.failedRequests.length) throw new Error(`failed same-origin requests: ${homeWatch.failedRequests.join(' | ')}`);
      return { evidence: `${http}; 0 console errors; 0 failed same-origin requests` };
    });

    await report('b sample ballot', async () => {
      if (!page.url().startsWith(base)) await loadHome(page, base);
      await pullBallot(page, 'sample');
      const ballot = await checkBallot(page);
      return { evidence: `${ballot.races} races; ${ballot.candidates} candidate rows; ${ballot.quotes} quote opened` };
    });

    const desktopShot = path.join(options.out, 'desktop-ballot.png');
    await report('h desktop screenshot', async () => {
      await page.locator('.pp-edition').waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
      await page.screenshot({ path: desktopShot, fullPage: true });
      return { evidence: desktopShot };
    });

    let usableBallot = await page.locator('.pp-edition').isVisible().catch(() => false);
    await report('c real address', async () => {
      await loadHome(page, base);
      const data = await pullBallot(page, options.address);
      usableBallot = true;
      if (data.sample) throw new Error(`real lookup fell back to the sample ballot (keys missing from .env.local?): ${data.notice ?? 'no notice'}`);
      const ballot = await checkBallot(page);
      return { evidence: `${ballot.races} races; ${ballot.candidates} candidate rows; ${ballot.quotes} quote opened` };
    });

    await report('d personalize', async () => {
      if (!usableBallot || !await page.locator('#pp-personalize').isVisible().catch(() => false)) {
        throw new Error('no personalization control on the rendered ballot');
      }
      await page.locator('#pp-personalize').click();
      const chip = page.locator('.pp-drawer button.chip:not(.none)').first();
      if (!await chip.isVisible().catch(() => false)) throw new Error('no issue control affects this ballot');
      await chip.click();
      const dial = page.locator('.pp-drawer input[type="range"]').first();
      await dial.waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
      await dial.focus();
      await dial.press('ArrowRight');
      await page.locator('article.pp-story .pp-fit').first().waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
      const fits = await page.locator('article.pp-story .pp-fit').count();
      return { evidence: `${fits} candidate fit indicators appeared after setting one issue` };
    });

    await report('e race page', async () => {
      const racePath = await findRacePath(desktop, base);
      const response = await page.goto(`${base}${racePath}`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT });
      if (response?.status() !== 200) throw new Error(`${racePath} returned ${response?.status() ?? 'no response'}`);
      await page.locator('article.pp-story').waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
      const candidates = await page.locator('article.pp-story .pp-cand').count();
      const quotes = await page.locator('article.pp-story .pp-quote blockquote').count();
      const sources = await page.locator('article.pp-story .pp-quote a[href]').count();
      if (!candidates || !quotes || !sources) throw new Error(`candidate rows ${candidates}, quotes ${quotes}, source links ${sources}`);
      return { evidence: `${racePath}; ${candidates} candidate rows; ${quotes} quotes; ${sources} source links` };
    });

    await report('f supporting pages', async () => {
      const paths = ['/compare', '/methodology', '/what-we-never-do', '/llms.txt'];
      const statuses: string[] = [];
      for (const pathname of paths) {
        const response = await page.goto(`${base}${pathname}`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT });
        const status = response?.status();
        statuses.push(`${pathname} ${status ?? 'no response'}`);
        if (status !== 200) throw new Error(statuses.join('; '));
      }
      return { evidence: statuses.join('; ') };
    });

    await desktop.close();

    const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const phonePage = await phone.newPage();
    const phoneWatch = watchPage(phonePage, base);
    let phoneBallotReady = false;
    await report('g phone home and sample ballot', async () => {
      const http = await loadHome(phonePage, base);
      await pullBallot(phonePage, 'sample');
      const ballot = await checkBallot(phonePage);
      phoneBallotReady = true;
      const dimensions = await phonePage.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }));
      if (phoneWatch.consoleErrors.length) throw new Error(`console errors: ${phoneWatch.consoleErrors.join(' | ')}`);
      if (phoneWatch.failedRequests.length) throw new Error(`failed same-origin requests: ${phoneWatch.failedRequests.join(' | ')}`);
      if (dimensions.scrollWidth > dimensions.innerWidth) throw new Error(`horizontal scroll ${dimensions.scrollWidth}px > ${dimensions.innerWidth}px`);
      return { evidence: `${http}; ${ballot.races} races; ${ballot.candidates} candidate rows; width ${dimensions.scrollWidth}/${dimensions.innerWidth}; 0 browser errors` };
    });

    const phoneShot = path.join(options.out, 'phone-ballot.png');
    await report('h phone screenshot', async () => {
      if (!phoneBallotReady) throw new Error('phone ballot did not render');
      await phonePage.screenshot({ path: phoneShot, fullPage: true });
      return { evidence: phoneShot };
    });
    await phone.close();

    // REVIEW.md rule 2: long real ballots must not scroll sideways on a small phone.
    await report('i small phone real ballot', async () => {
      const small = await browser!.newContext({ viewport: { width: 360, height: 800 } });
      try {
        const smallPage = await small.newPage();
        await loadHome(smallPage, base);
        const data = await pullBallot(smallPage, options.address);
        if (data.sample) throw new Error(`real lookup fell back to the sample ballot: ${data.notice ?? 'no notice'}`);
        const d = await smallPage.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }));
        if (d.scrollWidth > d.innerWidth) throw new Error(`horizontal scroll ${d.scrollWidth}px > ${d.innerWidth}px`);
        return { evidence: `${options.address}; width ${d.scrollWidth}/${d.innerWidth}` };
      } finally {
        await small.close();
      }
    });
  } catch (error) {
    console.log(`FAIL setup ${oneLine(error)}`);
    failures.push('setup');
  } finally {
    await browser?.close().catch(() => undefined);
    if (server) await stopServer(server);
  }

  if (failures.length) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  void main();
}
