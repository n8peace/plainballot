import { describe, expect, it } from 'vitest';
import { ELECTIONS_2027, anchor2027, changed2027, count2027, faq2027, has2027, states2027, type Election2027 } from '../lib/elections-2027';
import { dateForms, dayForms } from '../scripts/check-next-elections';
import { stale } from '../scripts/check-2027';
import { statePageChanged } from '../lib/ballot/state-races';
import { STATES } from '../lib/states';

const e = (state: string, date: string): Election2027 => ({
  state, date, name: 'General Election', sourceUrl: 'https://example.gov', snippet: date, offices: [], checked: '2026-11-17', since: '2026-11-17',
});

describe('2027 elections', () => {
  it('every entry is well formed and names its date in its snippet', () => {
    for (const x of ELECTIONS_2027) {
      expect(STATES[x.state], x.state).toBeTruthy();
      expect(x.date).toMatch(/^2027-\d{2}-\d{2}$/);
      expect(x.sourceUrl).toMatch(/^https:\/\//);
      expect(x.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(x.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const forms = x.yearHeading ? dayForms(x.date) : dateForms(x.date);
      expect(forms.some((re) => re.test(x.snippet)), `${x.state} ${x.date}`).toBe(true);
      if (x.yearHeading) expect(x.yearHeading).toContain('2027');
      // Offices come from an official page, or are left empty.
      if (x.offices.length) expect(x.officesSourceUrl && x.officesSnippets?.length, `${x.state} offices source`).toBeTruthy();
    }
  });

  it('groups by state, ordered by first election day, then by name', () => {
    const out = states2027([e('va', '2027-11-02'), e('ky', '2027-11-02'), e('ky', '2027-05-18'), e('dc', '2027-04-06'), e('wi', '2027-04-06')]);
    expect(out.map((s) => s.code)).toEqual(['dc', 'wi', 'ky', 'va']);
    expect(out[2].elections.map((x) => x.date)).toEqual(['2027-05-18', '2027-11-02']);
  });

  it('counts states and names D.C. separately', () => {
    expect(count2027(['ky'])).toBe('1 state');
    expect(count2027(['ky', 'va'])).toBe('2 states');
    expect(count2027(['dc', 'ky', 'va'])).toBe('2 states and the District of Columbia');
  });

  it('the FAQ names every state on the page and each election day', () => {
    const { a } = faq2027();
    for (const s of states2027()) expect(a).toContain(s.code === 'dc' ? 'District of Columbia' : STATES[s.code]);
    expect(a).toContain('November 2, 2027');
  });

  it('anchors match state page slugs and the page date is the newest entry', () => {
    expect(anchor2027('ky')).toBe('kentucky');
    expect(has2027('ky')).toBe(true);
    expect(has2027('ca')).toBe(false);
    expect(changed2027()).toBe([...ELECTIONS_2027.map((x) => x.since)].sort().at(-1));
  });

  it('a state page counts only its own 2027 entries', () => {
    const ky = ELECTIONS_2027.find((x) => x.state === 'ky')!;
    const saved = ky.since;
    try {
      ky.since = '2099-01-01';
      expect(changed2027('ky')).toBe('2099-01-01');
      expect(changed2027('va')).not.toBe('2099-01-01');
      expect(statePageChanged([], 'ky', '2026-11-17')).toBe('2099-01-01');
      expect(statePageChanged([], 'ca', '2026-11-17')).not.toBe('2099-01-01');
    } finally {
      ky.since = saved;
    }
  });

  it('a page behind a bot wall stops counting as checked after 45 days', () => {
    const today = new Date('2027-01-15T12:00:00Z');
    expect(stale('2026-12-15', today)).toBe(false);
    expect(stale('2026-11-17', today)).toBe(true);
  });
});

describe('dayForms', () => {
  it('matches a month and day with no year after it', () => {
    expect(dayForms('2027-08-03').some((re) => re.test('August 3....Primary Election'))).toBe(true);
    expect(dayForms('2027-11-02').some((re) => re.test('NOVEMBER 3 NOVEMBER 2 NOVEMBER 7'))).toBe(true);
  });
  it('does not match a different day, or a date that prints its own year', () => {
    expect(dayForms('2027-08-03').some((re) => re.test('August 30 Primary'))).toBe(false);
    expect(dayForms('2027-08-03').some((re) => re.test('August 3, 2023 Primary'))).toBe(false);
  });
});
