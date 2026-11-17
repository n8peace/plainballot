import { describe, expect, it } from 'vitest';
import type { RawContest } from '../lib/ballot/data';
import { raceCount, stateFaq, stateJsonLd, stateSections, statesCovered, stateUpdated } from '../lib/ballot/state-races';
import { STATES, stateFromSlug, stateSlug } from '../lib/states';

const contests: RawContest[] = [
  { id: 'u-s-representative-tx-district-1', division: 'tx/cd-1', level: 'federal', kind: 'candidate', office: 'U.S. Representative', district: 'TX District 1', checkedAt: '2026-09-25', choices: [{ name: 'B Person' }, { name: 'A Person' }] },
  { id: 'u-s-senator-tx', division: 'tx/state', level: 'federal', kind: 'candidate', office: 'U.S. Senator', district: 'TX', checkedAt: '2026-10-02', choices: [{ name: 'C Person' }] },
  { id: 'measure-a-x', division: 'ca/place-x', level: 'measures', kind: 'measure', office: 'Measure A', district: 'City of X', checkedAt: '2026-09-25', choices: [{ name: 'Yes' }, { name: 'No' }] },
  { id: 'Bad Id', division: 'tx/cd-2', level: 'federal', kind: 'candidate', office: 'U.S. Representative', district: 'TX District 2' },
];

describe('state names', () => {
  it('covers the 50 states and D.C., and slugs round-trip', () => {
    expect(Object.keys(STATES)).toHaveLength(51);
    for (const code of Object.keys(STATES)) expect(stateFromSlug(stateSlug(code))).toBe(code);
    expect(stateSlug('ny')).toBe('new-york');
    expect(stateFromSlug('narnia')).toBeNull();
  });
});

describe('a state page', () => {
  const tx = stateSections(contests, 'tx');

  it('groups races top of the ballot first, keeps the research order of choices, and skips broken links', () => {
    expect(tx.map((s) => s.title)).toEqual(['U.S. Senate', 'U.S. House']);
    expect(tx[1].races).toEqual([{ name: 'U.S. Representative, TX District 1', url: 'https://plainballot.com/r/tx~cd-1/u-s-representative-tx-district-1', choices: ['B Person', 'A Person'] }]);
  });

  it('puts District 2 before District 10', () => {
    const two = { ...contests[0], id: 'r-2', district: 'TX District 2', division: 'tx/cd-2' };
    const ten = { ...contests[0], id: 'r-10', district: 'TX District 10', division: 'tx/cd-10' };
    expect(stateSections([ten, two], 'tx')[0].races.map((r) => r.name)).toEqual(['U.S. Representative, TX District 2', 'U.S. Representative, TX District 10']);
  });

  it('names only what the state has', () => {
    expect(raceCount(tx)).toBe('2 races');
    expect(raceCount(stateSections(contests, 'ca'))).toBe('1 measure');
  });

  it('lists covered states by name and dates each by its newest check', () => {
    expect(statesCovered(contests)).toEqual(['ca', 'tx']);
    expect(stateUpdated(contests, 'tx')).toBe('2026-10-02');
  });

  it('asks the question word for word and answers without endorsing or claiming results', () => {
    const faq = stateFaq('tx', tx);
    expect(faq.q).toBe('Who ran for office in Texas in 2026, in their own words?');
    expect(faq.a).toContain('Plain Ballot researched 2 races on Texas’s November 3, 2026 ballot: U.S. Senate (1), U.S. House (1).');
    expect(faq.a).toContain('never endorses anyone');
    expect(faq.a).not.toMatch(/\b(best|first|official|won|winner)\b/i);
  });

  it('structured data: the page with its breadcrumb, and the question as an FAQ', () => {
    const [page, faq] = stateJsonLd('tx', tx, '2026-10-02');
    expect(page['@type']).toBe('CollectionPage');
    expect(page.url).toBe('https://plainballot.com/races/texas');
    expect(page.dateModified).toBe('2026-10-02');
    expect(faq['@type']).toBe('FAQPage');
    expect(JSON.stringify(page)).not.toMatch(/Person/); // no candidate is named in the tags
  });
});
