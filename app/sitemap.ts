import type { MetadataRoute } from 'next';
import { allContests, dataUpdated, type RawContest } from '@/lib/ballot/data';
import { citablePage, pageUpdated } from '@/lib/citable';
import { lastChanged, newest } from '@/lib/page-dates';
import { SITE_URL, raceShareUrl } from '@/lib/share';

// Built once per deploy, while git history is on hand. Every date is read from git history or the data feed, never typed by hand.
export const dynamic = 'force-static';

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home = newest(await dataUpdated(), lastChanged(['app/page.tsx', 'components/Paper.tsx', 'lib/faq.ts']));
  const contests = await allContests().catch((err) => {
    console.warn(`sitemap: research data unavailable, race pages left out this deploy: ${err}`);
    return [] as RawContest[];
  });
  return [
    { url: SITE_URL, lastModified: home, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/methodology`, lastModified: pageUpdated(citablePage('/methodology')), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/what-we-never-do`, lastModified: pageUpdated(citablePage('/what-we-never-do')), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/releases`, lastModified: pageUpdated(citablePage('/releases')), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: lastChanged(['app/privacy']), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: lastChanged(['app/terms']), changeFrequency: 'monthly', priority: 0.3 },
    ...raceEntries(contests),
  ];
}
