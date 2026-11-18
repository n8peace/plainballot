// Checks every 2027 election against its official pages: the date snippet (and, for a calendar
// grid, the year heading), each office shown and its snippets must appear word for word. A page
// behind a bot wall is reported, not failed, until its hand check is more than 45 days old.
//   npm run check:2027
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ELECTIONS_2027 } from '../lib/elections-2027';
import { checkEntry } from './check-next-elections';
import { checkTerm } from './check-terms';

const STALE_DAYS = 45;
export function stale(checked: string, today = new Date()): boolean {
  return (today.getTime() - Date.parse(`${checked}T00:00:00Z`)) / 86_400_000 > STALE_DAYS;
}

async function main() {
  let failed = 0;
  let unread = 0;
  for (const e of ELECTIONS_2027) {
    const problems = [await checkEntry(e)];
    if (e.offices.length) {
      const src = e.officesSourceUrl ?? '';
      // Every office shown, and every snippet that ties the list to 2027, must be on the offices page.
      for (const snippet of [...(e.officesSnippets ?? []), ...e.offices]) problems.push(await checkTerm({ sourceUrl: src, snippet }).then((p) => p && `offices "${snippet}": ${p}`));
      if (!e.officesSnippets?.length) problems.push('offices listed with no snippet tying them to 2027');
    }
    const real = problems.filter((p): p is string => !!p);
    // A page behind a bot wall is reported, not failed, until its hand check goes stale.
    const botOnly = real.length > 0 && real.every((p) => p.includes('could not read the source (bot check'));
    const blocked = botOnly && !stale(e.checked);
    if (botOnly && !blocked) real.push(`unread since ${e.checked}; read it by hand and update checked`);
    console.log(`${real.length ? (blocked ? 'UNREAD' : 'FAIL') : 'PASS'} ${e.state} ${e.date}${real.length ? ` ${real.join('; ')}` : ''}`);
    if (blocked) unread += 1;
    else if (real.length) failed += 1;
  }
  console.log(`${ELECTIONS_2027.length - failed - unread} of ${ELECTIONS_2027.length} match their official pages; ${unread} could not be read; ${failed} failed.`);
  if (failed || (ELECTIONS_2027.length && unread === ELECTIONS_2027.length)) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main();
