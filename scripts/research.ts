// Research one contest and write data/positions/<contest>.json for human review.
//
//   npm run research -- contests/example.json
//
// The input file lists the contest and, for each candidate (or Yes/No for a
// measure), the source URLs to read. See data/research/example.json.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { fetchSource, researchChoice, RESEARCH_MODEL } from '../lib/ai/research';
import { issuesForOffice } from '../lib/ballot/offices';
import { contestKey, POSITIONS_DIR, type PositionsFile } from '../lib/ballot/positions';
import { ISSUE_IDS } from '../lib/issues';

const Input = z.object({
  office: z.string(),
  district: z.string().optional(),
  kind: z.enum(['candidate', 'measure', 'retention']).default('candidate'),
  issues: z.array(z.enum(ISSUE_IDS)).optional(),
  choices: z.array(z.object({ name: z.string(), party: z.string().optional(), sources: z.array(z.url()).min(1) })),
});

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: npm run research -- <contest.json>');
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error('Set AI_GATEWAY_API_KEY in .env.local first.');
  }
  const input = Input.parse(JSON.parse(await readFile(file, 'utf8')));
  const issues = input.issues ?? issuesForOffice(input.office);
  console.log(`Researching ${input.office}${input.district ? ` (${input.district})` : ''} with ${RESEARCH_MODEL}`);

  const choices: PositionsFile['choices'] = [];
  const allUrls = new Set<string>();
  for (const ch of input.choices) {
    const sources = [];
    for (const url of ch.sources) {
      try {
        sources.push(await fetchSource(url));
        allUrls.add(url);
      } catch (e) {
        console.warn(`  ! ${(e as Error).message}`);
      }
    }
    if (!sources.length) {
      console.warn(`  ! ${ch.name}: no readable sources, skipped`);
      choices.push({ name: ch.name, party: ch.party, stances: {} });
      continue;
    }
    const { stances, dropped } = await researchChoice({
      name: ch.name,
      office: input.office,
      issues,
      sources,
      isMeasure: input.kind === 'measure',
    });
    console.log(`  ${ch.name}: ${Object.keys(stances).length} sourced positions, ${dropped.length} dropped`);
    dropped.forEach((d) => console.log(`    dropped ${d}`));
    choices.push({ name: ch.name, party: ch.party, stances });
  }

  const out: PositionsFile = {
    office: input.office,
    district: input.district,
    kind: input.kind,
    issues,
    choices,
    sources: [...allUrls].map((u) => new URL(u).hostname).filter((h, i, a) => a.indexOf(h) === i).join(' · '),
    checkedAt: new Date().toISOString().slice(0, 10),
    reviewed: false,
  };
  await mkdir(POSITIONS_DIR, { recursive: true });
  const dest = path.join(POSITIONS_DIR, `${contestKey(input.office, input.district)}.json`);
  await writeFile(dest, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nWrote ${path.relative(process.cwd(), dest)}. Check every claim against its quote, then set "reviewed": true.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
