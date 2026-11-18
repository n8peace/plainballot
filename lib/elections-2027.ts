// Statewide (or, for D.C., districtwide) elections in 2027, from each state's own election office.
// Same rules as lib/next-election.ts: a date is listed only when an official page prints it, the
// snippet is that page's exact words, and npm run check:2027 rechecks them every Monday. Offices
// are listed only as the official page lists them. Candidate names never appear here.
import { SITE_URL } from './share';
import { newest } from './page-dates';
import { electionDay } from './next-election';
import { STATES, stateSlug } from './states';

export type Election2027 = {
  state: string;
  /** YYYY-MM-DD */
  date: string;
  /** The election's name as the official page gives it. */
  name: string;
  sourceUrl: string;
  /** Exact words from the source, including the date. */
  snippet: string;
  /** For a calendar grid that prints the year only as a column heading: that heading, which must
   *  also be on the page. The snippet then needs only the month and day. */
  yearHeading?: string;
  /** What is on the ballot, only as an official page lists it. Empty when the state hasn't said. */
  offices: string[];
  officesSourceUrl?: string;
  /** Exact words from the offices page that tie the list to 2027 (a heading or a grid row). Each
   *  office above must also appear on that page, in the same words. In a calendar grid, the match
   *  of each office to the 2027 column was read by hand on `checked`. */
  officesSnippets?: string[];
  /** YYYY-MM-DD, the day the snippets were last matched. */
  checked: string;
  /** YYYY-MM-DD, the day this entry went up or last changed. Bump it on any change. */
  since: string;
};

const KY_OFFICES = ['Governor', 'Lieutenant Governor', 'Secretary of State', 'Attorney General', 'Auditor of Public Accounts', 'State Treasurer', 'Commissioner of Agriculture'];
const KY_OFFICES_URL = 'https://elect.ky.gov/Resources/Documents/Election%20Schedule%202026-2036.pdf';
const KY_OFFICES_SNIPPETS = ['Governor, Lieutenant Governor, Secretary of State, Attorney General, Auditor of Public Accounts, State Treasurer, Commissioner of Agriculture'];
const MS_URL = 'https://www.sos.ms.gov/sites/default/files/publications/Election%20Calendar_2026.pdf';
// In the calendar's own words, under "Elected Offices for 2027" and "Statewide:".
const MS_OFFICES = ['Governor', 'Lt. Governor', 'Secretary of State', 'Auditor', 'Attorney General', 'Treasurer', 'Commissioner of Insurance', 'Commissioner of Ag. & Commerce', 'State Senators', 'State Representatives', 'Transportation Commissioners', 'Public Service Commissioners', 'District Attorney'];
const MS_OFFICES_SNIPPETS = ['Elected Offices for 2027'];
const LA_ETHICS_URL = 'https://www.ethics.la.gov/Pub/CampFinan/Sched/20271009.pdf';
const PA_URL = 'https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/voting-and-elections/running-for-office/2027/2027-election-calendar.pdf';
const VA_URL = 'https://www.elections.virginia.gov/media/boardpapers/calendar/Five_year_election_day_calendar-2026_2030.pdf';
const ON = { checked: '2026-11-17', since: '2026-11-17' };

export const ELECTIONS_2027: Election2027[] = [
  {
    state: 'dc', date: '2027-04-06', name: 'Special Election',
    sourceUrl: 'https://dcboe.org/elections/at-large_member_of_the_council_special_election',
    snippet: 'April 6, 2027 Special Election At-Large Member of the D.C. Council Special Election',
    offices: ['At-Large Member of the D.C. Council'],
    officesSourceUrl: 'https://dcboe.org/elections/at-large_member_of_the_council_special_election',
    officesSnippets: ['At-Large Member of the D.C. Council Special Election'],
    ...ON,
  },
  {
    state: 'wi', date: '2027-04-06', name: 'Spring Election',
    sourceUrl: 'https://elections.wi.gov/event/2027-spring-election',
    snippet: 'Tuesday, April 6, 2027',
    offices: [],
    ...ON,
  },
  {
    state: 'ky', date: '2027-05-18', name: 'Primary Election',
    sourceUrl: 'https://elect.ky.gov/Pages/default.aspx',
    snippet: 'May 18, 2027 - Primary Election Day',
    offices: KY_OFFICES, officesSourceUrl: KY_OFFICES_URL, officesSnippets: KY_OFFICES_SNIPPETS,
    ...ON,
  },
  {
    state: 'pa', date: '2027-05-18', name: 'Municipal Primary',
    sourceUrl: PA_URL,
    snippet: 'Tuesday, May 18, 2027 Municipal Primary',
    offices: [],
    ...ON,
  },
  {
    state: 'ms', date: '2027-08-03', name: 'Primary Election',
    sourceUrl: MS_URL,
    snippet: 'August 3............................................................Primary Election',
    yearHeading: '2027 Election',
    offices: MS_OFFICES, officesSourceUrl: MS_URL, officesSnippets: MS_OFFICES_SNIPPETS,
    ...ON,
  },
  {
    state: 'ms', date: '2027-08-31', name: 'Primary Runoff Election',
    sourceUrl: MS_URL,
    snippet: 'August 31..............................................Primary Runoff Election',
    yearHeading: '2027 Election',
    offices: [],
    ...ON,
  },
  {
    state: 'la', date: '2027-10-09', name: 'Gubernatorial Primary',
    sourceUrl: LA_ETHICS_URL,
    snippet: 'PRIMARY ELECTION – October 9, 2027',
    offices: [],
    ...ON,
  },
  {
    state: 'ky', date: '2027-11-02', name: 'General Election',
    sourceUrl: 'https://elect.ky.gov/Resources/Documents/2027%20Election%20Calendar.pdf',
    snippet: 'General Election Day (first Tuesday after first Monday in Ky. Const. 11/2/27',
    offices: KY_OFFICES, officesSourceUrl: KY_OFFICES_URL, officesSnippets: KY_OFFICES_SNIPPETS,
    ...ON,
  },
  {
    state: 'ms', date: '2027-11-02', name: 'General Election',
    sourceUrl: MS_URL,
    snippet: 'November 2......................................................General Election',
    yearHeading: '2027 Election',
    offices: MS_OFFICES, officesSourceUrl: MS_URL, officesSnippets: MS_OFFICES_SNIPPETS,
    ...ON,
  },
  {
    state: 'pa', date: '2027-11-02', name: 'Municipal Election',
    sourceUrl: PA_URL,
    snippet: 'Tuesday, November 2, 2027 Municipal Election',
    offices: [],
    ...ON,
  },
  {
    state: 'va', date: '2027-11-02', name: 'General Election',
    sourceUrl: VA_URL,
    snippet: 'NOVEMBER 3 NOVEMBER 2 NOVEMBER 7 NOVEMBER 6 NOVEMBER 5',
    yearHeading: '2026 2027 2028 2029 2030',
    offices: ['Senate of Virginia', 'House of Delegates'], officesSourceUrl: VA_URL, officesSnippets: ['U. S. Senator (1) Senate of Virginia President Governor U. S. Senator (1)', '(2-year term) House of Delegates U. S. Representative (11)'],
    ...ON,
  },
  {
    state: 'la', date: '2027-11-20', name: 'Gubernatorial General',
    sourceUrl: LA_ETHICS_URL,
    snippet: 'GENERAL ELECTION – November 20, 2027',
    offices: [],
    ...ON,
  },
  {
    state: 'ms', date: '2027-11-30', name: 'General Runoff Election',
    sourceUrl: MS_URL,
    snippet: 'November 30........................................General Runoff Election',
    yearHeading: '2027 Election',
    offices: [],
    ...ON,
  },
];

export const PAGE_2027 = `${SITE_URL}/elections/2027`;

/** States with a 2027 election, ordered by their first election day, then by name. */
export function states2027(list = ELECTIONS_2027): { code: string; elections: Election2027[] }[] {
  const by = new Map<string, Election2027[]>();
  for (const e of [...list].sort((a, b) => a.date.localeCompare(b.date))) by.set(e.state, [...(by.get(e.state) ?? []), e]);
  return [...by.entries()]
    .sort(([a, ea], [b, eb]) => ea[0].date.localeCompare(eb[0].date) || STATES[a].localeCompare(STATES[b]))
    .map(([code, elections]) => ({ code, elections }));
}

/** The anchor for a state's section: /elections/2027#kentucky */
export function anchor2027(code: string): string {
  return stateSlug(code);
}

export function has2027(code: string): boolean {
  return ELECTIONS_2027.some((e) => e.state === code);
}

/** The page's date: the newest change to any entry, or to one state's entries. */
export function changed2027(code?: string): string | undefined {
  return newest(...ELECTIONS_2027.filter((e) => !code || e.state === code).map((e) => e.since));
}

const name = (code: string) => (code === 'dc' ? 'the District of Columbia' : STATES[code]);

/** "Kentucky, Louisiana and the District of Columbia" */
function list(names: string[]): string {
  return names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** "6 states and the District of Columbia", "1 state" */
export function count2027(codes: string[]): string {
  const n = codes.filter((c) => c !== 'dc').length;
  return `${n} ${n === 1 ? 'state' : 'states'}${codes.includes('dc') ? ' and the District of Columbia' : ''}`;
}

export function faq2027() {
  const states = states2027();
  const names = states.map((s) => name(s.code));
  return {
    q: 'Which states vote in 2027?',
    a: `On official election calendars, ${list(names)} hold an election in 2027 that covers the whole state or district. ${states
      .map((s) => `${STATES[s.code]}: ${s.elections.map((e) => `${e.name}, ${electionDay(e.date)}`).join('; ')}.`)
      .join(' ')} Other states may add special elections or ballot measures, and many cities and counties vote in 2027 too.`,
  };
}
