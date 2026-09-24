import type { IssueId } from '../issues';
import type { Ballot, Choice, Contest } from '../types';
import { issuesForOffice } from './offices';
import { contestKey, fileToContest, loadPositions, nameKey, slug } from './positions';

// Ballot contents by address from the Google Civic Information API (voterinfo).
// Positions come only from our own research files; a contest we haven't
// researched is shown with its candidates and marked "not researched yet".

interface CivicCandidate { name: string; party?: string; candidateUrl?: string }
interface CivicContest {
  type?: string;
  office?: string;
  district?: { name?: string; scope?: string };
  candidates?: CivicCandidate[];
  referendumTitle?: string;
  referendumSubtitle?: string;
  referendumBrief?: string;
  numberVotingFor?: string;
}
interface CivicResponse {
  election?: { name?: string; electionDay?: string };
  normalizedInput?: { city?: string; state?: string; zip?: string };
  contests?: CivicContest[];
  error?: { message?: string };
}

export class BallotLookupError extends Error {}

export async function lookupGoogleCivic(address: string, apiKey: string): Promise<Ballot> {
  const url = new URL('https://www.googleapis.com/civicinfo/v2/voterinfo');
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);
  if (process.env.GOOGLE_CIVIC_ELECTION_ID) url.searchParams.set('electionId', process.env.GOOGLE_CIVIC_ELECTION_ID);

  const res = await fetch(url, { next: { revalidate: 3600 } });
  const data = (await res.json()) as CivicResponse;
  if (!res.ok) {
    throw new BallotLookupError(
      res.status === 400
        ? 'We couldn’t find a ballot for that address. Check the street and ZIP, or try again closer to the election.'
        : `Ballot lookup failed (${data.error?.message ?? res.status}).`,
    );
  }

  const positions = await loadPositions();
  const n = data.normalizedInput;
  const contests = (data.contests ?? []).map((c, i) => toContest(c, i, positions));

  return {
    electionName: data.election?.name ?? 'Upcoming election',
    electionDate: data.election?.electionDay ?? '',
    place: [n?.city, n?.state].filter(Boolean).join(', '),
    sample: false,
    contests,
  };
}

function toContest(c: CivicContest, i: number, positions: Awaited<ReturnType<typeof loadPositions>>): Contest {
  const isMeasure = !!c.referendumTitle && !c.candidates?.length;
  const office = isMeasure ? c.referendumTitle! : c.office ?? 'Contest';
  const district = c.district?.name;
  const found = positions.get(contestKey(office, district)) ?? positions.get(contestKey(office));

  if (isMeasure) {
    return {
      id: slug(`${office}-${i}`),
      kind: 'measure',
      office,
      sub: [c.referendumSubtitle, 'Yes or No'].filter(Boolean).join(' · '),
      summary: c.referendumBrief,
      issues: found?.issues ?? [],
      choices: found ? fileToContest(found).choices : [],
      researched: !!found,
      reviewedByPerson: found?.reviewed,
      sources: found?.sources,
    };
  }

  const issues: IssueId[] = found?.issues ?? issuesForOffice(office);
  const researchedByName = new Map(found ? fileToContest(found).choices.map((ch) => [nameKey(ch.name), ch]) : []);
  const choices: Choice[] = (c.candidates ?? []).map((cand) => {
    const r = researchedByName.get(nameKey(cand.name));
    return {
      id: slug(cand.name),
      name: cand.name,
      party: cand.party,
      url: cand.candidateUrl,
      stances: r?.stances ?? {},
    };
  });

  const voteFor = c.numberVotingFor && c.numberVotingFor !== '1' ? `Vote for ${c.numberVotingFor}` : 'Vote for one';
  return {
    id: slug(`${office}-${district ?? ''}-${i}`),
    kind: 'candidate',
    office,
    sub: [district, voteFor].filter(Boolean).join(' · '),
    issues,
    choices,
    researched: !!found,
    reviewedByPerson: found?.reviewed,
    sources: found?.sources,
  };
}
