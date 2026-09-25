// Lists every local ballot measure in California (county, city and school district)
// for Nov 3, 2026, county by county, and researches the ones a dial applies to.
//
//   npm run ca:local-measures                 # list and research everything not yet done
//   npm run ca:local-measures -- --list       # just build the list
//   npm run ca:local-measures -- --county "Contra Costa"
//
// Two independent agents (Claude Code and Codex) read each county's official measure
// list; a measure is kept only when both list it. Three models then vote on which dials
// it decides. Measures from special districts (water, fire, parks) are skipped: voters
// can't be matched to those districts by address yet.

import { execFile } from 'node:child_process';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { gateway, generateText, isStepCount, Output } from 'ai';
import { z } from 'zod';
import { contestKey, POSITIONS_DIR } from '../lib/ballot/positions';
import { runCli } from '../lib/research/backends';
import { mapMeasureIssues } from './research-state';

const run = promisify(execFile);

export const CA_COUNTIES = ['Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa', 'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles', 'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada', 'Orange', 'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino', 'San Diego', 'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo', 'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama', 'Trinity', 'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba'];

const Measures = z.object({
  sourceUrl: z.string().optional(),
  measures: z.array(z.object({
    letter: z.string(),
    jurisdiction: z.string(),
    type: z.enum(['county', 'city', 'school', 'special']),
    title: z.string(),
    summary: z.string(),
  })),
});
type Measure = z.infer<typeof Measures>['measures'][number];

function prompt(county: string) {
  return `Find the official list of local ballot measures on the November 3, 2026 general election ballot in ${county} County, California, from the county registrar of voters or elections office. Include county, city and school district measures, and special district measures (mark those "special").
For each: its letter or number, the jurisdiction exactly as named (e.g. "City of Oakland", "Mount Diablo Unified School District", "${county} County"), its type (county, city, school or special), its official short title, and a one-sentence neutral summary of what a Yes vote does, with no adjectives that praise or criticize.
Reply with ONLY this JSON, no other text:
{"sourceUrl":"<official list>","measures":[{"letter":"A","jurisdiction":"...","type":"city","title":"...","summary":"A Yes vote ..."}]}`;
}

async function readList(backend: 'claude-code' | 'codex', county: string) {
  const parse = (t: string) => Measures.parse(JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)));
  try { return parse(await runCli(backend, prompt(county))); } catch (e) {
    console.log(`  ${backend} unavailable for ${county} (${(e as Error).message.slice(0, 80)}); reading via the API instead`);
    try {
      const { output } = await generateText({
        // A different model for each reader, so two fallbacks are still independent.
        model: backend === 'codex' ? 'anthropic/claude-haiku-4.5' : (process.env.RESEARCH_FALLBACK || 'gateway:openai/gpt-5.6-terra').replace(/^gateway:/, ''),
        abortSignal: AbortSignal.timeout(10 * 60 * 1000),
        tools: { web_search: gateway.tools.perplexitySearch({ maxResults: 5, maxTokensPerPage: 2048, maxTokens: 12000, country: 'US' }) },
        stopWhen: isStepCount(8),
        output: Output.object({ schema: Measures }),
        prompt: prompt(county),
      });
      return output;
    } catch { return null; }
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The district key voters are matched by (see lib/address/census.ts). */
export function localDivision(m: Pick<Measure, 'jurisdiction' | 'type'>, county: string): string | null {
  const j = m.jurisdiction.trim();
  if (m.type === 'county') return `ca/county-${slug(county)}`;
  if (m.type === 'city') return `ca/place-${slug(j.replace(/^(city|town) of /i, '').replace(/ (city|town)$/i, ''))}`;
  if (m.type === 'school') return `ca/school-${slug(j.replace(/ school district$/i, ''))}`;
  return null;
}

const letter = (m: Measure) => m.letter.replace(/^measure\s+/i, '').replace(/\W/g, '').toUpperCase();
const same = (a: Measure, b: Measure, county: string) => letter(a) === letter(b) && localDivision(a, county) === localDivision(b, county);

async function main() {
  const only = process.argv.includes('--county') ? [process.argv[process.argv.indexOf('--county') + 1]] : CA_COUNTIES;
  const dir = path.join(process.cwd(), 'data', 'research', 'ca-local');
  await mkdir(dir, { recursive: true });
  const existing = new Set((await readdir(POSITIONS_DIR)).map((f) => f.replace(/\.json$/, '')));
  const queue: string[] = [];

  // A few counties at a time: each read is a long agent session.
  const counties = [...only];
  const lister = async () => { while (counties.length) { const county = counties.shift()!;
    const [a, b] = await Promise.all([readList('claude-code', county), readList('codex', county)]);
    if (!a || !b) { console.log(`${county}: need two independent readers; skipped`); continue; }
    const agreed = a.measures.filter((m) => b.measures.some((o) => same(m, o, county)));
    let kept = 0;
    for (const m of agreed) {
      const division = localDivision(m, county);
      if (!division) continue;
      const office = `Measure ${letter(m)}`;
      const district = m.jurisdiction;
      const key = contestKey(office, district);
      const issues = await mapMeasureIssues('California', { number: letter(m), title: m.title, summary: m.summary }, `${m.jurisdiction} Measure ${letter(m)}`);
      const input = { office, district, division, kind: 'measure', summary: m.summary, issues, choices: [{ name: 'Yes' }, { name: 'No' }] };
      await writeFile(path.join(dir, `${key}.json`), JSON.stringify(input, null, 2) + '\n');
      if (!issues.length && !existing.has(key)) {
        // Still shown on the ballot with its summary, just without a match.
        await writeFile(path.join(POSITIONS_DIR, `${key}.json`), JSON.stringify({ ...input, choices: [{ name: 'Yes', stances: {} }, { name: 'No', stances: {} }], checkedAt: new Date().toISOString().slice(0, 10), reviewed: false }, null, 2) + '\n');
      }
      if (issues.length && !existing.has(key)) queue.push(path.join(dir, `${key}.json`));
      kept++;
    }
    console.log(`${county}: ${kept} measures kept (${a.measures.length} and ${b.measures.length} listed) · ${a.sourceUrl ?? b.sourceUrl ?? ''}`);
  } };
  await Promise.all(Array.from({ length: Number(process.env.LIST_PARALLEL || 3) }, lister));
  console.log(`\n${queue.length} measures to research.`);
  if (process.argv.includes('--list')) return;

  const minBalance = Number(process.env.RESEARCH_MIN_BALANCE || 5);
  let done = 0;
  const worker = async () => {
    while (queue.length) {
      const balance = Number((await gateway.getCredits().catch(() => ({ balance: '999' }))).balance);
      if (balance < minBalance) { console.log(`  ■ stopping: AI credit is $${balance.toFixed(2)}. Add credit and rerun to continue.`); return; }
      const file = queue.shift()!;
      try {
        const { stdout, stderr } = await run('node', ['--env-file-if-exists=.env.local', '--import', 'tsx', 'scripts/research.ts', file], { maxBuffer: 50 * 1024 * 1024, timeout: 45 * 60 * 1000 });
        await writeFile(file.replace(/\.json$/, '.log'), stdout + stderr);
        console.log(`  ✓ ${path.basename(file, '.json')} (${++done} done, ${queue.length} left)`);
      } catch (e) {
        console.log(`  ✗ ${path.basename(file, '.json')}: ${(e as Error).message.split('\n').slice(-2).join(' ')}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Number(process.env.RESEARCH_PARALLEL || 2) }, worker));
  console.log('Done.');
}

if (process.argv[1]?.endsWith('ca-local-measures.ts')) main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
