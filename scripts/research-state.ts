// Research every federal, statewide and legislative contest in one state.
//
//   npm run research:state -- CA                  # everything not yet researched
//   npm run research:state -- CA --only federal   # federal | statewide | legislature
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
import { runCli } from '../lib/research/backends';
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

const LEVEL_TEXT: Record<Level, string> = {
  federal: 'U.S. Senate and U.S. House',
  statewide: 'statewide executive offices (Governor, Lieutenant Governor, Attorney General, Secretary of State, Treasurer, Controller or Comptroller, and similar)',
  legislature: 'state legislature (both chambers)',
};

function listPrompt(state: string, level: Level) {
  return `Find the official certified list of candidates for the November 3, 2026 general election in ${state} (usually published by the Secretary of State or state elections board). From it, list every contest for ${LEVEL_TEXT[level]} and the candidates who will appear on the general-election ballot. For top-two or runoff systems, only the finalists. Skip uncontested seats only if the list marks them unopposed; otherwise include them. Use names as they appear on the ballot.
Reply with ONLY this JSON, no other text:
{"sourceUrl":"<the official list>","contests":[{"office":"<e.g. U.S. Representative>","district":"<e.g. District 10, or omit for statewide>","candidates":[{"name":"...","party":"..."}]}]}`;
}

async function listContests(state: string, level: Level) {
  const [a, b] = await Promise.all([runCli('claude-code', listPrompt(state, level)), runCli('codex', listPrompt(state, level))]);
  const parse = (t: string) => Contests.parse(JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)));
  const [la, lb] = [parse(a), parse(b)];
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

async function main() {
  const state = process.argv[2]?.toUpperCase();
  if (!state || !/^[A-Z]{2}$/.test(state)) throw new Error('Usage: npm run research:state -- CA [--only federal|statewide|legislature] [--list]');
  const only = process.argv.includes('--only') ? (process.argv[process.argv.indexOf('--only') + 1] as Level) : null;
  const levels: Level[] = only ? [only] : ['federal', 'statewide', 'legislature'];
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
  const worker = async () => {
    while (queue.length) {
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
