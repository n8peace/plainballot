// Checks every ballot-word answer's source: fetches the official page and confirms the snippet
// appears word for word. A page behind a bot wall is reported, not failed.
//   npm run check:terms
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TERMS } from '../lib/terms';
import { normalize, pageText } from './check-next-elections';

export async function checkTerm(t: { sourceUrl: string; snippet: string }): Promise<string | null> {
  let text: string;
  try {
    text = await pageText(t.sourceUrl);
  } catch (err) {
    return `could not read the source (${(err as Error).message})`;
  }
  return normalize(text).includes(normalize(t.snippet)) ? null : 'snippet not found word for word on the page';
}

async function main() {
  let failed = 0;
  let unread = 0;
  for (const t of TERMS) {
    const problem = await checkTerm(t);
    const blocked = problem?.startsWith('could not read the source (bot check');
    console.log(`${problem ? (blocked ? 'UNREAD' : 'FAIL') : 'PASS'} ${t.slug}${problem ? ` ${problem}` : ''}`);
    if (blocked) unread += 1;
    else if (problem) failed += 1;
  }
  console.log(`${TERMS.length - failed - unread} of ${TERMS.length} match their official page; ${unread} could not be read; ${failed} failed.`);
  if (failed || (TERMS.length && unread === TERMS.length)) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main();
