import { locate } from '../address/census';
import type { Ballot } from '../types';
import { BallotLookupError, lookupGoogleCivic } from './google-civic';
import { contestsForDivisions } from './positions';
import { SAMPLE_BALLOT } from './sample';

export { BallotLookupError } from './google-civic';

/** States we research for this election. Others get a clear notice and a sample ballot. */
export const COVERED_STATES = (process.env.COVERED_STATES || 'CA').split(',').map((s) => s.trim().toUpperCase());

const ELECTION = { electionName: 'General Election', electionDate: process.env.ELECTION_DATE || SAMPLE_BALLOT.electionDate };

/**
 * 1. Find the voter's districts (U.S. Census, free).
 * 2. Official contests and candidates from Google Civic, once published.
 * 3. Otherwise, the races volunteers have researched for those districts.
 * 4. Otherwise, the sample ballot, with the voter's real districts shown.
 */
export async function getBallot(address: string): Promise<Ballot> {
  if (address.trim().toLowerCase() === 'sample') return SAMPLE_BALLOT;

  const loc = await locate(address).catch((e) => {
    console.error('census lookup failed', e);
    return undefined;
  });
  if (loc === null) {
    throw new BallotLookupError('We couldn’t find that address. Pick it from the suggestions, or check the street number and ZIP code.');
  }
  const districts = loc?.districts ?? [];
  if (loc && !COVERED_STATES.includes(loc.state)) {
    const stateName = districts.find((d) => d.key.endsWith('/state'))?.label ?? loc.state;
    return {
      ...SAMPLE_BALLOT,
      districts,
      needsResearch: true,
      notice: `Plain Ballot covers California for the November 2026 election. ${stateName} isn’t covered yet, so here’s a sample ballot with fictional candidates. Want your state next? Tell us, or help research it on GitHub.`,
    };
  }
  const place = districts.find((d) => d.key.includes('/place-'))?.label ?? loc?.state ?? '';
  const key = process.env.GOOGLE_CIVIC_API_KEY;

  if (key) {
    const live = await lookupGoogleCivic(loc?.matchedAddress ?? address, key).catch((e) => {
      if (!(e instanceof BallotLookupError)) console.error('civic lookup failed', e);
      return null;
    });
    if (live?.contests.length) return { ...live, districts };
  }

  const researched = await contestsForDivisions(districts.map((d) => d.key));
  if (researched.length) {
    return {
      ...ELECTION,
      place,
      sample: false,
      districts,
      contests: researched,
      notice: 'The official candidate list for your address isn’t published yet. These are the races we’ve researched for your districts so far.',
    };
  }

  return {
    ...SAMPLE_BALLOT,
    districts,
    needsResearch: true,
    notice: 'We found your districts, but none of your races are researched yet and the official candidate list isn’t published. Here’s a sample ballot until then.',
  };
}
