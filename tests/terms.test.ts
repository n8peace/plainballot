import { describe, expect, it } from 'vitest';
import { TERMS, partyKey, sameParty, term, termChanged, termExamples, termJsonLd, termsFor } from '../lib/terms';
import { sourceHost } from '../lib/next-election';

const race = (o: Record<string, unknown>) => ({ id: 'x', kind: 'candidate', division: 'ca/sldl-12', office: 'State Assembly', district: 'CA District 12', checkedAt: '2026-09-30', ...o });

describe('ballot words', () => {
  it('treats spellings of one party as one, and no-party labels as none', () => {
    expect(partyKey('DEM')).toBe(partyKey('Democratic Party'));
    expect(partyKey('Democrat')).toBe('democratic');
    expect(partyKey('REP')).toBe(partyKey('Republican'));
    expect(partyKey('NPP')).toBe('');
    expect(partyKey(undefined)).toBe('');
  });

  it('finds two finalists of one party, but not two with no party', () => {
    expect(sameParty(race({ choices: [{ name: 'A', party: 'Democratic' }, { name: 'B', party: 'DEM' }] }))).toBe(true);
    expect(sameParty(race({ choices: [{ name: 'A', party: 'Democratic' }, { name: 'B', party: 'Republican' }] }))).toBe(false);
    expect(sameParty(race({ choices: [{ name: 'A', party: 'NPP' }, { name: 'B', party: 'NPP' }] }))).toBe(false);
    expect(sameParty(race({ choices: [{ name: 'A', party: 'Democratic' }] }))).toBe(false);
  });

  it('links a race to the words it shows, and only those', () => {
    const bond = race({ kind: 'measure', id: 'measure-m', division: 'ca/school-sdusd', office: 'Measure M', summary: 'Authorizes $1 billion in bonds for school repairs.' });
    expect(termsFor(bond).map((t) => t.slug).sort()).toEqual(['ballot-measure', 'bond-measure']);
    const topTwo = race({ choices: [{ name: 'A', party: 'Democratic' }, { name: 'B', party: 'Democratic' }] });
    expect(termsFor(topTwo).map((t) => t.slug)).toEqual(['top-two-primary']);
    // Same-party finalists outside California are not a California top-two race.
    expect(termsFor({ ...topTwo, division: 'tx/cd-1' })).toEqual([]);
    const spi = race({ division: 'ca/state', office: 'Superintendent of Public Instruction', choices: [{ name: 'A', party: 'Nonpartisan' }, { name: 'B', party: 'Nonpartisan' }] });
    expect(termsFor(spi)).toEqual([]);
  });

  it('lists statewide races first, then by name with district 2 before 10, and dates the page by its newest change', () => {
    const t = term('top-two-primary')!;
    const two = [{ name: 'A', party: 'Democratic' }, { name: 'B', party: 'Democratic' }];
    const contests = [
      race({ id: 'a-10', district: 'CA District 10', choices: two, checkedAt: '2026-12-01' }),
      race({ id: 'a-2', district: 'CA District 2', choices: two }),
      race({ id: 'ic', division: 'ca/state', office: 'Insurance Commissioner', district: 'CA', choices: two }),
    ];
    expect(termExamples(t, contests).map((e) => e.path)).toEqual(['/r/ca~state/ic', '/r/ca~sldl-12/a-2', '/r/ca~sldl-12/a-10']);
    expect(termChanged(t, contests)).toBe('2026-12-01');
    expect(termChanged(t, [])).toBe(t.since);
    const [page, faq] = termJsonLd(t, '2026-12-01');
    expect(page.dateModified).toBe('2026-12-01');
    expect(faq.mainEntity[0].name).toBe(t.q);
  });

  it('every word has a plain answer and an official source', () => {
    for (const t of TERMS) {
      expect(t.slug, t.slug).toMatch(/^[a-z-]+$/);
      expect(t.q.endsWith('?'), t.slug).toBe(true);
      expect(t.answer, t.slug).not.toMatch(/[—–]/);
      expect(t.answer, t.slug).not.toMatch(/\b(best|worst|should vote|good|bad|unfortunately)\b/i);
      expect(t.snippet.length, t.slug).toBeGreaterThanOrEqual(10);
      expect(t.since <= t.checked, t.slug).toBe(true);
      expect(new URL(t.sourceUrl).protocol, t.slug).toBe('https:');
      expect(sourceHost(t.sourceUrl), t.slug).toMatch(/\.gov$/);
    }
    expect(new Set(TERMS.map((t) => t.slug)).size).toBe(TERMS.length);
  });
});
