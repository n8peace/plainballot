import type { MetadataRoute } from 'next';
import type { Contest } from '../types';
import type { RawContest } from './data';
import { CONTEST_ID_RE, SITE_URL, decodeDivision, raceShareUrl } from '../share';
import { STATES, stateSlug } from '../states';
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

/** The name, description and link a race page shows; the page title, share tags and JSON-LD all use these. */
export function raceSummary(race: { division: string; contest: Contest }) {
  const district = race.contest.sub.split(' · ')[0];
  const name = `${race.contest.office}, ${district}`;
  return { name, description: `See every choice and its sourced positions for ${name}.`, url: raceShareUrl(race.division, race.contest.id) };
}

/** Plain WebPage tags for a race page: only what the page itself shows, dated by its research check. */
export function raceJsonLd(race: { division: string; contest: Contest }) {
  const { name, description, url } = raceSummary(race);
  const code = race.division.split('/')[0];
  const date = race.contest.checkedAt && /^\d{4}-\d{2}-\d{2}$/.test(race.contest.checkedAt) ? race.contest.checkedAt : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url,
    inLanguage: 'en-US',
    ...(date ? { dateModified: date } : {}),
    isPartOf: { '@type': 'WebSite', name: 'Plain Ballot', url: SITE_URL },
    ...(code in STATES
      ? {
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Plain Ballot', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: STATES[code], item: `${SITE_URL}/races/${stateSlug(code)}` },
              { '@type': 'ListItem', position: 3, name, item: url },
            ],
          },
        }
      : {}),
  };
}

/** The state a race belongs to ("tx" for "tx/cd-1"), when it is one of the 50 states or D.C. */
export function raceState(division: string): string | null {
  const code = division.split('/')[0];
  return code in STATES ? code : null;
}
