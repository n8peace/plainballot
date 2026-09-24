// Research every federal, statewide and legislative contest in one state.
//
//   npm run research:state -- CA                  # everything not yet researched
//   npm run research:state -- CA --only federal   # federal | statewide | legislature | measures
//   npm run research:state -- CA --list           # just build the contest list
//
// 1. Two independent agents (Claude Code and Codex, on your subscriptions) each read
//    the state's official certified candidate list. A contest and its candidates
//    are kept only where both agree.
// 2. Each contest is written to data/research/<state>/ and researched with the
//    usual consensus process (3 agents, 10 on disagreement), a few at a time.
//    Contests that already have a research file are skipped, so the command can
//    be stopped and resumed.

import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';
import { contestKey, nameKey, POSITIONS_DIR } from '../lib/ballot/positions';
import { gateway, generateText, isStepCount, Output } from 'ai';
import { runCli } from '../lib/research/backends';
import { ISSUE_IDS, sideGuide } from '../lib/issues';
import { canonicalOffice, divisionFor, levelFor, type Level } from '../lib/research/divisions';

const run = promisify(execFile);

const Contests = z.object({
  contests: z.array(z.object({
    office: z.string(),
    district: z.string().optional(),
    candidates: z.array(z.object({ name: z.string(), party: z.string().optional() })),
  })),
  sourceUrl: z.string().optional(),
});

const LEVEL_TEXT: Record<Exclude<Level, 'measures'>, string> = {
  federal: 'U.S. Senate and U.S. House',
  statewide: 'statewide executive offices (Governor, Lieutenant Governor, Attorney General, Secretary of State, Treasurer, Controller or Comptroller, and similar)',
  legislature: 'state legislature (both chambers)',
};

function listPrompt(state: string, level: Exclude<Level, 'measures'>) {
  return `Find the official certified list of candidates for the November 3, 2026 general election in ${state} (usually published by the Secretary of State or state elections board). From it, list every contest for ${LEVEL_TEXT[level]} and the candidates who will appear on the general-election ballot. For top-two or runoff systems, only the finalists. Skip uncontested seats only if the list marks them unopposed; otherwise include them. Use names as they appear on the ballot.
Reply with ONLY this JSON, no other text:
{"sourceUrl":"<the official list>","contests":[{"office":"<e.g. U.S. Representative>","district":"<e.g. District 10, or omit for statewide>","candidates":[{"name":"...","party":"..."}]}]}`;
}

/** Reads the list with an API model and web search, when a subscription is out of usage. */
async function listViaGateway(state: string, level: Exclude<Level, 'measures'>): Promise<z.infer<typeof Contests>> {
  const { output } = await generateText({
    model: (process.env.RESEARCH_FALLBACK || 'gateway:openai/gpt-5.6-terra').replace(/^gateway:/, ''),
    abortSignal: AbortSignal.timeout(10 * 60 * 1000),
    tools: { web_search: gateway.tools.perplexitySearch({ maxResults: 5, maxTokensPerPage: 2048, maxTokens: 12000, country: 'US' }) },
    stopWhen: isStepCount(8),
    output: Output.object({ schema: Contests }),
    prompt: listPrompt(state, level),
  });
  return output;
}

async function listContests(state: string, level: Exclude<Level, 'measures'>) {
  const parse = (t: string) => Contests.parse(JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)));
  const read = async (backend: 'claude-code' | 'codex') => {
    try { return parse(await runCli(backend, listPrompt(state, level))); } catch (e) {
      console.log(`  ${backend} unavailable (${(e as Error).message.slice(0, 80)}); reading the list via the API instead`);
      return listViaGateway(state, level);
    }
  };
  const [la, lb] = await Promise.all([read('claude-code'), read('codex')]);
  // Several statewide offices share a division, so the office name is part of the key.
  const key = (c: { office: string; district?: string }) => `${divisionFor(state, c.office, c.district) ?? contestKey(c.office, c.district)}|${canonicalOffice(c.office)}`;
  const byKey = new Map(lb.contests.map((c) => [key(c), c]));
  const agreed = [];
  for (const c of la.contests) {
    const other = byKey.get(key(c));
    if (!other) { console.log(`  ? only one agent listed ${c.office} ${c.district ?? ''}; skipped`); continue; }
    const names = new Set(other.candidates.map((x) => nameKey(x.name)));
    const candidates = c.candidates.filter((x) => names.has(nameKey(x.name)));
    if (candidates.length !== c.candidates.length || candidates.length !== other.candidates.length) {
      console.log(`  ? agents disagree on candidates for ${c.office} ${c.district ?? ''}; skipped for a person to check`);
      continue;
    }
    agreed.push({ ...c, candidates });
  }
  console.log(`  ${level}: ${agreed.length} contests agreed (${la.contests.length} and ${lb.contests.length} listed) · ${la.sourceUrl ?? lb.sourceUrl ?? ''}`);
  return agreed;
}

// ---- Statewide ballot measures (propositions) ----

const Measures = z.object({
  measures: z.array(z.object({ number: z.string(), title: z.string(), summary: z.string(), issues: z.array(z.string()) })),
  sourceUrl: z.string().optional(),
});

function measuresPrompt(state: string) {
  return `Find the official list of statewide ballot measures (propositions) on the November 3, 2026 general election ballot in ${state}, from the Secretary of State or the official voter guide. For each: its number, its official short title, a one-sentence neutral summary of what a Yes vote does (no adjectives that praise or criticize), and which of these issue ids it directly decides (only ones that clearly apply, possibly none):
${sideGuide(ISSUE_IDS)}
Reply with ONLY this JSON, no other text:
{"sourceUrl":"<official list>","measures":[{"number":"<e.g. 50>","title":"...","summary":"A Yes vote ...","issues":["<issue id>"]}]}`;
}

async function listMeasures(state: string) {
  const parse = (t: string) => Measures.parse(JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)));
  const read = async (backend: 'claude-code' | 'codex') => {
    try { return parse(await runCli(backend, measuresPrompt(state))); } catch (e) {
      console.log(`  ${backend} unavailable for measures (${(e as Error).message.slice(0, 80)}); skipping that reader`);
      return null;
    }
  };
  const [a, b] = await Promise.all([read('claude-code'), read('codex')]);
  if (!a || !b) { console.log('  measures: need two independent readers; skipped'); return []; }
  const byNum = new Map(b.measures.map((m) => [m.number.replace(/\D/g, ''), m]));
  const valid = (ids: string[]) => ids.filter((id) => (ISSUE_IDS as readonly string[]).includes(id));
  const agreed = a.measures.flatMap((m) => {
    const other = byNum.get(m.number.replace(/\D/g, ''));
    if (!other) { console.log(`  ? only one agent listed Proposition ${m.number}; skipped`); return []; }
    // Issues: only the ones both readers tied to this measure.
    const issues = valid(m.issues).filter((id) => valid(other.issues).includes(id));
    return [{ ...m, number: m.number.replace(/\D/g, ''), issues }];
  });
  console.log(`  measures: ${agreed.length} agreed (${a.measures.length} and ${b.measures.length} listed) · ${a.sourceUrl ?? b.sourceUrl ?? ''}`);
  return agreed;
}

async function main() {
  const state = process.argv[2]?.toUpperCase();
  if (!state || !/^[A-Z]{2}$/.test(state)) throw new Error('Usage: npm run research:state -- CA [--only federal|statewide|legislature] [--list]');
  const only = process.argv.includes('--only') ? (process.argv[process.argv.indexOf('--only') + 1] as Level) : null;
  const levels: Level[] = only ? [only] : ['federal', 'statewide', 'legislature', 'measures'];
  const dir = path.join(process.cwd(), 'data', 'research', state.toLowerCase());
  await mkdir(dir, { recursive: true });

  // Contests already researched, by district + office, whatever the file is named.
  const covered = new Set<string>();
  for (const f of (await readdir(POSITIONS_DIR)).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
    const d = JSON.parse(await readFile(path.join(POSITIONS_DIR, f), 'utf8'));
    if (d.division) covered.add(`${d.division}|${canonicalOffice(d.office)}`);
  }
  const queue: string[] = [];
  for (const level of levels) {
    if (level === 'measures') {
      for (const m of await listMeasures(state)) {
        const office = `Proposition ${m.number}`;
        const division = `${state.toLowerCase()}/state`;
        const input = { office, district: m.title, division, kind: 'measure', summary: m.summary, issues: m.issues, choices: [{ name: 'Yes' }, { name: 'No' }] };
        const file = path.join(dir, `${contestKey(office, m.title)}.json`);
        await writeFile(file, JSON.stringify(input, null, 2) + '\n');
        if (!m.issues.length) {
          // Still show it on the ballot with its summary, just without a match.
          const posFile = path.join(POSITIONS_DIR, `${contestKey(office, m.title)}.json`);
          await writeFile(posFile, JSON.stringify({ ...input, choices: [{ name: 'Yes', stances: {} }, { name: 'No', stances: {} }], checkedAt: new Date().toISOString().slice(0, 10), reviewed: false }, null, 2) + '\n');
          console.log(`  Proposition ${m.number}: no dial applies; listed with its summary, no match`);
        }
        if (m.issues.length && !covered.has(`${division}|${canonicalOffice(office)}`)) queue.push(file);
      }
      continue;
    }
    for (const c of await listContests(state, level)) {
      const division = divisionFor(state, c.office, c.district);
      if (!division || levelFor(c.office) !== level) continue;
      const district = c.district ? `${state} ${c.district}` : state;
      const input = { office: c.office, district, division, kind: 'candidate', choices: c.candidates };
      const file = path.join(dir, `${contestKey(c.office, district)}.json`);
      await writeFile(file, JSON.stringify(input, null, 2) + '\n');
      if (!covered.has(`${division}|${canonicalOffice(c.office)}`)) queue.push(file);
    }
  }
  console.log(`\n${queue.length} contests to research.`);
  if (process.argv.includes('--list')) return;

  const parallel = Number(process.env.RESEARCH_PARALLEL || 2);
  let done = 0;
  // Stop cleanly before AI credit runs out, rather than failing halfway through a contest.
  const minBalance = Number(process.env.RESEARCH_MIN_BALANCE || 5);
  const worker = async () => {
    while (queue.length) {
      const balance = Number((await gateway.getCredits().catch(() => ({ balance: '999' }))).balance);
      if (balance < minBalance) { console.log(`  ■ stopping: AI credit is $${balance.toFixed(2)} (minimum $${minBalance}). Add credit and rerun to continue.`); return; }
      const file = queue.shift()!;
      const name = path.basename(file, '.json');
      try {
        // Each contest gets its own log, and a hard cap so one stuck contest can't stall the batch.
        const { stdout, stderr } = await run('node', ['--env-file-if-exists=.env.local', '--import', 'tsx', 'scripts/research.ts', file], { maxBuffer: 50 * 1024 * 1024, timeout: 45 * 60 * 1000 });
        await writeFile(path.join(dir, `${name}.log`), stdout + stderr);
        console.log(`  ✓ ${name} (${++done} done, ${queue.length} left)`);
      } catch (e) {
        console.log(`  ✗ ${name}: ${(e as Error).message.split('\n').slice(-2).join(' ')}`);
      }
    }
  };
  await Promise.all(Array.from({ length: parallel }, worker));
  console.log('\nDone. Review with `npm run review`.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
