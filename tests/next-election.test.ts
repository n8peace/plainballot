import { afterEach, describe, expect, it } from 'vitest';
import { NEXT_ELECTIONS, electionDay, nextElection, nextElectionFaq, sourceHost, todayEastern } from '../lib/next-election';
import { stateJsonLd } from '../lib/ballot/state-races';

const SAMPLE = {
  date: '2028-03-07',
  name: 'Presidential Primary Election',
  sourceUrl: 'https://www.sos.ca.gov/elections/upcoming-elections',
  snippet: 'March 7, 2028 Presidential Primary Election',
  checked: '2026-11-17',
};
const saved = { ...NEXT_ELECTIONS };
afterEach(() => {
  for (const k of Object.keys(NEXT_ELECTIONS)) delete NEXT_ELECTIONS[k];
  Object.assign(NEXT_ELECTIONS, saved);
});

describe('next election', () => {
  it('calls D.C. districtwide, not statewide', async () => {
    const { scope } = await import('../lib/next-election');
    expect(scope('dc')).toBe('districtwide');
    expect(scope('ca')).toBe('statewide');
    expect(nextElectionFaq('dc', '2026-11-17')?.q).toBe('When is my next election in the District of Columbia?');
    expect(nextElectionFaq('dc', '2026-11-17')?.a).not.toMatch(/county/);
  });

  it('shows nothing for a state with no official date', () => {
    delete NEXT_ELECTIONS.zz;
    expect(nextElection('zz', '2026-11-17')).toBeNull();
    expect(nextElectionFaq('zz', '2026-11-17')).toBeNull();
  });

  it('shows the date through election day, and nothing after it', () => {
    NEXT_ELECTIONS.ca = SAMPLE;
    expect(nextElection('ca', '2028-03-07')).toEqual(SAMPLE);
    expect(nextElection('ca', '2028-03-08')).toBeNull();
  });

  it('writes the day without a time zone shift', () => {
    expect(electionDay('2028-03-07')).toBe('Tuesday, March 7, 2028');
    expect(todayEastern(new Date('2026-11-18T04:30:00Z'))).toBe('2026-11-17');
    expect(todayEastern(new Date('2026-11-18T05:30:00Z'))).toBe('2026-11-18');
    expect(sourceHost('https://www.sos.ca.gov/x')).toBe('sos.ca.gov');
  });

  it('answers the question with the date and source, and never names a candidate or a guess', () => {
    NEXT_ELECTIONS.ca = SAMPLE;
    const faq = nextElectionFaq('ca', '2026-11-17')!;
    expect(faq.q).toBe('When is my next election in California?');
    expect(faq.a).toContain('The next statewide election on California’s official calendar is the Presidential Primary Election on Tuesday, March 7, 2028, according to sos.ca.gov.');
    expect(faq.a).toContain('A special election can be added before then');
    expect(faq.a).toContain('Plain Ballot will quote the candidates then');
    expect(faq.a).not.toMatch(/\b(likely|expected|probably|should|best|first|official candidates are)\b/i);
  });

  it('adds the question to the state page FAQ tag only when a date is listed', () => {
    const tx = [{ title: 'U.S. Senate', races: [{ name: 'U.S. Senate', url: 'https://plainballot.com/r/tx/us-senate', choices: [] }] }];
    expect(stateJsonLd('tx', tx, undefined, '2026-11-17')[1].mainEntity).toHaveLength(1);
    NEXT_ELECTIONS.tx = { ...SAMPLE, sourceUrl: 'https://www.sos.state.tx.us/elections/' };
    const entities = stateJsonLd('tx', tx, undefined, '2026-11-17')[1].mainEntity;
    expect(entities).toHaveLength(2);
    expect(entities[1].name).toBe('When is my next election in Texas?');
  });

  it('every listed state has a well-formed entry from an official page', () => {
    for (const [code, e] of Object.entries(NEXT_ELECTIONS)) {
      expect(e!.date, code).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e!.checked, code).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e!.snippet.length, code).toBeGreaterThanOrEqual(10);
      expect(new URL(e!.sourceUrl).protocol, code).toBe('https:');
      expect(sourceHost(e!.sourceUrl), code).not.toMatch(/ballotpedia|wikipedia|ncsl|vote411|ballotready/);
    }
  });
});

describe('date check', () => {
  it('recognizes the ways an official page writes a date', async () => {
    const { dateForms, normalize } = await import('../scripts/check-next-elections');
    const hit = (s: string) => dateForms('2028-03-07').some((re) => re.test(s));
    expect(hit('Tuesday, March 7, 2028')).toBe(true);
    expect(hit('Mar. 7, 2028')).toBe(true);
    expect(hit('3/7/2028')).toBe(true);
    expect(hit('03/07/28')).toBe(true);
    expect(hit('2028-03-07')).toBe(true);
    expect(hit('March 17, 2028')).toBe(false);
    expect(hit('March 7, 2027')).toBe(false);
    expect(normalize('Primary  Election – “March”')).toBe('primary election - "march"');
  });
});
