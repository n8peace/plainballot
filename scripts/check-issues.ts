// The dial wording lives in the research repo (open-election-data), which
// researches against it. This site keeps a copy for its interface; this check fails
// if the two drift apart.
//
//   npm run check:issues

import { ISSUES } from '../lib/issues';
import { ELECTION_DATA_URL } from '../lib/ballot/data';

async function main() {
  const res = await fetch(`${ELECTION_DATA_URL}/issues.json`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${ELECTION_DATA_URL}/issues.json returned ${res.status}`);
  const theirs = JSON.stringify((await res.json()).issues);
  if (theirs !== JSON.stringify(ISSUES)) {
    console.error('lib/issues.ts differs from the research data. Copy lib/issues.ts from open-election-data.');
    process.exit(1);
  }
  console.log(`Dial wording matches the research data (${ISSUES.length} issues).`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
