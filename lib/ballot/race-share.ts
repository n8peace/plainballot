import type { MetadataRoute } from 'next';
import type { Contest } from '../types';
import type { RawContest } from './data';
import { CONTEST_ID_RE, decodeDivision, raceShareUrl } from '../share';
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

/** One line per researched race or measure, dated by the day its research was checked. */
export function raceEntries(contests: RawContest[]): MetadataRoute.Sitemap {
  return contests.flatMap((c) => {
    try {
      const checked = typeof c.checkedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.checkedAt) ? c.checkedAt : undefined;
      return [{ url: raceShareUrl(String(c.division), String(c.id)), lastModified: checked, changeFrequency: 'monthly' as const, priority: 0.5 }];
    } catch {
      return []; // a malformed id or division never makes a broken link
    }
  });
}
