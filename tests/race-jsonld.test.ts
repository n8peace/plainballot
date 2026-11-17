import { describe, expect, it } from 'vitest';
import { raceJsonLd, raceSummary } from '../lib/ballot/race-share';
import type { Contest } from '../lib/types';

const contest: Contest = {
  id: 'attorney-general-ca', division: 'ca/state', kind: 'candidate', office: 'Attorney General',
  sub: 'California · Vote for one', issues: [], choices: [], researched: true, checkedAt: '2026-09-25',
};

describe('race page structured data', () => {
  it('is a plain WebPage that says only what the page shows', () => {
    const ld = raceJsonLd({ division: 'ca/state', contest });
    expect(ld).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Attorney General, California',
      description: 'See every choice and its sourced positions for Attorney General, California.',
      url: 'https://plainballot.com/r/ca~state/attorney-general-ca',
      inLanguage: 'en-US',
      dateModified: '2026-09-25',
      isPartOf: { '@type': 'WebSite', name: 'Plain Ballot', url: 'https://plainballot.com' },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Plain Ballot', item: 'https://plainballot.com' },
          { '@type': 'ListItem', position: 2, name: 'California', item: 'https://plainballot.com/races/california' },
          { '@type': 'ListItem', position: 3, name: 'Attorney General, California', item: 'https://plainballot.com/r/ca~state/attorney-general-ca' },
        ],
      },
    });
  });

  it('leaves the date out rather than guess one', () => {
    expect(raceJsonLd({ division: 'ca/state', contest: { ...contest, checkedAt: undefined } })).not.toHaveProperty('dateModified');
  });

  it('matches the page title and share tags', () => {
    const ld = raceJsonLd({ division: 'ca/state', contest });
    const s = raceSummary({ division: 'ca/state', contest });
    expect([ld.name, ld.description, ld.url]).toEqual([s.name, s.description, s.url]);
  });

  it('names no party, candidate or verdict', () => {
    const withPeople = { ...contest, choices: [{ id: 'a', name: 'Someone', party: 'Some Party', stances: {} }] } as Contest;
    expect(JSON.stringify(raceJsonLd({ division: 'ca/state', contest: withPeople }))).not.toMatch(/Someone|Party|best|recommend/i);
  });
});
