import type { Ballot } from '../types';
import { lookupGoogleCivic } from './google-civic';
import { SAMPLE_BALLOT } from './sample';

export { BallotLookupError } from './google-civic';

/** Live lookup when a Google Civic key is set; otherwise the fictional sample ballot. */
export async function getBallot(address: string): Promise<Ballot> {
  const key = process.env.GOOGLE_CIVIC_API_KEY;
  if (!key || address.trim().toLowerCase() === 'sample') {
    return {
      ...SAMPLE_BALLOT,
      notice: key
        ? SAMPLE_BALLOT.notice
        : 'Live ballot lookup isn’t connected yet, so this is a sample ballot. The candidates, races and records are fictional.',
    };
  }
  const live = await lookupGoogleCivic(address, key);
  if (live.contests.length) return live;
  // The election is listed but races for this address aren't published yet
  // (Google usually loads them in the last few weeks before Election Day).
  return {
    ...SAMPLE_BALLOT,
    notice: `Your ${live.electionName || 'ballot'} details for ${live.place || 'this address'} haven’t been published yet. That usually happens in the last few weeks before Election Day. Until then, here’s a sample ballot with fictional candidates.`,
  };
}
