// Checks every next-election date against its official page: fetches the page, and confirms the
// snippet appears word for word and names the same date. No match, no line.
//   npm run check:elections                 (the entries in lib/next-election.ts)
//   npm run check:elections -- <file.json>  (research to check before it is added)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEXT_ELECTIONS } from '../lib/next-election';

type Entry = { state: string; date: string | null; sourceUrl: string | null; snippet: string | null; yearHeading?: string };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Ways an official page may write the date: "March 7, 2028", "Mar. 7, 2028", "3/7/2028", "03/07/2028", "2028-03-07". */
export function dateForms(date: string): RegExp[] {
  const [y, m, d] = date.split('-').map(Number);
  const month = MONTHS[m - 1];
  return [
    new RegExp(`\\b${month.slice(0, 3)}[a-z]*\\.?\\s+0?${d}(st|nd|rd|th)?,?\\s+${y}\\b`, 'i'),
    new RegExp(`\\b0?${m}/0?${d}/(${y}|${String(y).slice(2)})\\b`),
    new RegExp(`\\b${date}\\b`),
  ];
}

/** The month and day alone ("August 3", "Aug. 3", "8/3"), for a calendar grid that prints the year
 *  only as a column heading. */
export function dayForms(date: string): RegExp[] {
  const [, m, d] = date.split('-').map(Number);
  const month = MONTHS[m - 1];
  return [new RegExp(`\\b${month.slice(0, 3)}[a-z]*\\.?\\s+0?${d}(st|nd|rd|th)?\\b(?!,?\\s*\\d{4})`, 'i'), new RegExp(`\\b0?${m}/0?${d}\\b(?!/)`)];
}

/** Lowercase, plain quotes and dashes, single spaces: so formatting never decides a match. */
export function normalize(text: string): string {
  return text
    .replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/ /g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function htmlText(html: string): string {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, '’').replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// One fetch per page per run, however many entries cite it.
const pages = new Map<string, Promise<string>>();
export function pageText(url: string): Promise<string> {
  if (!pages.has(url)) pages.set(url, fetchText(url));
  return pages.get(url)!;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': 'PlainBallotCheck/1.0 (+https://plainballot.com)' }, signal: AbortSignal.timeout(20_000) });
  if (res.status === 403 || res.status === 429) throw new Error(`bot check: HTTP ${res.status}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
    const dir = mkdtempSync(path.join(tmpdir(), 'pb-election-'));
    try {
      const file = path.join(dir, 'source.pdf');
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8', timeout: 30_000 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  const html = await res.text();
  // Some election sites answer scripts with a bot check page (status 200). That is unread, not a mismatch.
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? '';
  if (/captcha|robot|access denied|just a moment|attention required/i.test(title)) throw new Error(`bot check page: ${title.trim()}`);
  return htmlText(html);
}

export async function checkEntry(e: Entry): Promise<string | null> {
  if (!e.date || !e.sourceUrl || !e.snippet) return 'no date, source or snippet';
  // A grid that prints the year only as a heading: the snippet names the day, the page the year.
  const forms = e.yearHeading ? dayForms(e.date) : dateForms(e.date);
  if (!forms.some((re) => re.test(e.snippet!))) return `snippet does not name ${e.date}`;
  let text: string;
  try {
    text = await pageText(e.sourceUrl);
  } catch (err) {
    return `could not read the source (${(err as Error).message})`;
  }
  if (e.yearHeading && !normalize(text).includes(normalize(e.yearHeading))) return `year heading "${e.yearHeading}" not found on the page`;
  return normalize(text).includes(normalize(e.snippet)) ? null : 'snippet not found word for word on the page';
}

async function main() {
  const file = process.argv[2];
  const entries: Entry[] = file
    ? (JSON.parse(readFileSync(file, 'utf8')) as Entry[]).filter((e) => e.date)
    : Object.entries(NEXT_ELECTIONS).map(([state, e]) => ({ state, ...e! }));
  // A page behind a bot wall (a captcha page, 403 or 429) is reported, not failed, so a site's bot
  // wall never pulls a true date. Any other error, or a page that no longer says the date, fails.
  let failed = 0;
  let unread = 0;
  for (const e of entries) {
    const problem = await checkEntry(e);
    const blocked = problem?.startsWith('could not read the source (bot check');
    console.log(`${problem ? (blocked ? 'UNREAD' : 'FAIL') : 'PASS'} ${e.state} ${e.date}${problem ? ` ${problem}` : ''}`);
    if (blocked) unread += 1;
    else if (problem) failed += 1;
  }
  console.log(`${entries.length - failed - unread} of ${entries.length} match their official page; ${unread} could not be read; ${failed} failed.`);
  // Every page behind a bot wall means nothing was checked at all: that fails too.
  if (failed || (entries.length && unread === entries.length)) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main();
