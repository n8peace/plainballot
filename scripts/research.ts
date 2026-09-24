// Research one contest with independent agents and write data/positions/<contest>.json
// for human review.
//
//   npm run research -- data/research/example.json
//
// 1. Who's on the ballot: 3 agents must agree (10 and a majority if they don't),
//    unless the input file lists the candidates.
// 2. Each candidate: 3 agents on models from different companies each search,
//    read and record sourced positions. Quotes are checked word for word.
// 3. If they disagree on any issue, 7 more agents run and a 6-of-10 majority
//    decides. No majority means the issue is left blank.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { issuesForOffice } from '../lib/ballot/offices';
import { contestKey, POSITIONS_DIR, type PositionsFileInput } from '../lib/ballot/positions';
import { ISSUE_IDS, issueById, NEITHER, type IssueId } from '../lib/issues';
import { RESEARCH_MODELS } from '../lib/research/agent';
import { findRoster } from '../lib/research/roster';
import { researchWithConsensus } from '../lib/research/run';

const Input = z.object({
  office: z.string(),
  district: z.string().optional(),
  division: z.string().optional(),
  kind: z.enum(['candidate', 'measure', 'retention']).default('candidate'),
  summary: z.string().optional(),
  issues: z.array(z.enum(ISSUE_IDS)).optional(),
  choices: z.array(z.object({ name: z.string(), party: z.string().optional(), sources: z.array(z.url()).optional() })).optional(),
});

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: npm run research -- <contest.json>');
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) throw new Error('Set AI_GATEWAY_API_KEY in .env.local first.');
  const input = Input.parse(JSON.parse(await readFile(file, 'utf8')));
  const issues = input.issues ?? issuesForOffice(input.office);
  const office = [input.office, input.district].filter(Boolean).join(', ');
  console.log(`Researching ${office} with ${RESEARCH_MODELS.join(', ')}`);

  const roster = input.choices ?? (input.kind === 'measure' ? [{ name: 'Yes' }, { name: 'No' }] : await findRoster(input.office, input.district));
  if (!roster.length) throw new Error('Could not confirm who is on the ballot. Add "choices" to the input file.');

  const choices: PositionsFileInput['choices'] = [];
  const hosts = new Set<string>();
  for (const ch of roster) {
    console.log(`\n  ${ch.name}`);
    const r = await researchWithConsensus({
      name: ch.name,
      office,
      issues,
      isMeasure: input.kind === 'measure',
      seedUrls: 'sources' in ch ? ch.sources : undefined,
    });
    const stances: NonNullable<PositionsFileInput['choices'][number]['stances']> = {};
    for (const [id, d] of Object.entries(r.decisions)) {
      const i = issueById[id as IssueId];
      const tag = `${i.name}: ${d!.outcome === 'none' ? 'no position' : d!.outcome} (${d!.agreement})`;
      if (!d!.stance) { console.log(`    ${tag}`); continue; }
      const s = d!.stance;
      stances[id as IssueId] = {
        toward: s.pos === 0 ? NEITHER : s.pos < 0 ? i.l : i.r,
        strength: Math.abs(s.pos) === 2 ? 'strong' : 'lean',
        text: s.text,
        quote: s.quote,
        sourceUrl: s.sourceUrl,
        agreement: d!.agreement,
      };
      hosts.add(new URL(s.sourceUrl).hostname.replace(/^www\./, ''));
      console.log(`    ${tag}  ✓`);
    }
    if (r.split.length) console.log(`    no majority, left blank: ${r.split.map((id) => issueById[id].name).join(', ')}`);
    console.log(`    ${r.runs} agents on ${r.models.join(', ')}`);
    choices.push({ name: ch.name, party: 'party' in ch ? ch.party : undefined, stances });
  }

  const out: PositionsFileInput = {
    office: input.office,
    district: input.district,
    division: input.division,
    kind: input.kind,
    summary: input.summary,
    issues,
    choices,
    sources: [...hosts].join(' · '),
    checkedAt: new Date().toISOString().slice(0, 10),
    reviewed: false,
  };
  await mkdir(POSITIONS_DIR, { recursive: true });
  const dest = path.join(POSITIONS_DIR, `${contestKey(input.office, input.district)}.json`);
  await writeFile(dest, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nWrote ${path.relative(process.cwd(), dest)}. Check it with \`npm run review\`, then set "reviewed": true.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
