import type { Contest } from '../types';
import { CONTEST_ID_RE, decodeDivision } from '../share';
import { contestsForDivisions } from './positions';

export function findContest(contests: Contest[], contestId: string): Contest | null {
  return contests.find((contest) => contest.id === contestId) ?? null;
}

export async function loadSharedRace(divisionSegment: string, contestId: string): Promise<{ division: string; contest: Contest } | null> {
  const division = decodeDivision(divisionSegment);
  if (!division || !CONTEST_ID_RE.test(contestId)) return null;
  const contest = findContest(await contestsForDivisions([division]), contestId);
  return contest ? { division, contest } : null;
}
