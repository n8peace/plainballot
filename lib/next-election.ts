// Each state's next statewide election, from that state's own election office or laws. A state is
// listed only when an official page gives a fixed date, and the snippet is that page's exact words
// (npm run check:elections fetches each page and checks them). No date, no line. Candidate names
// never appear here: official lists come only after filing closes.
import { STATES } from './states';

export type NextElection = {
  /** YYYY-MM-DD, the election day. */
  date: string;
  /** The election's official name, e.g. "Presidential Primary Election". */
  name: string;
  /** An official page that gives the date. */
  sourceUrl: string;
  /** Exact words from that page, including the date. */
  snippet: string;
  /** YYYY-MM-DD, the day the snippet was last matched on the page. */
  checked: string;
};

export const NEXT_ELECTIONS: Partial<Record<string, NextElection>> = {
  al: {
    date: '2028-03-07',
    name: 'Primary Election',
    sourceUrl: 'https://www.sos.alabama.gov/sites/default/files/election-data/Alabama%20Election%20Chart%202026-2036%208.7.2026.pdf',
    snippet: '2028 Primary - 3/7/2028; 2028 Runoff - 4/4/2028; 2028 General - 11/7/2028',
    checked: '2026-11-17',
  },
  ca: {
    date: '2028-03-07',
    name: 'Primary Election',
    sourceUrl: 'https://www.sos.ca.gov/elections/political-parties/political-bodies-attempting-qualify',
    snippet: 'March 7, 2028, Primary Election',
    checked: '2026-11-17',
  },
  dc: {
    date: '2027-04-06',
    name: 'Special Election for At-Large Member of the D.C. Council',
    sourceUrl: 'https://dcboe.org/elections/at-large_member_of_the_council_special_election',
    snippet: 'April 6, 2027 Special Election At-Large Member of the D.C. Council Special Election',
    checked: '2026-11-17',
  },
  fl: {
    date: '2028-03-21',
    name: 'Presidential Preference Primary',
    sourceUrl: 'https://dos.fl.gov/elections/for-voters/quick-facts-presidential-preference-primary/',
    snippet: 'next Presidential Preference Primary Election (PPP) is on March 21, 2028.',
    checked: '2026-11-17',
  },
  il: {
    date: '2028-03-21',
    name: 'General Primary Election',
    sourceUrl: 'https://www.elections.il.gov/agencyforms/1%20SCHEDULE%20OF%20FUTURE%20ELECTIONS/Schedule%20of%20Elections%20-%20Revised.pdf',
    snippet: 'March 21, 2028',
    checked: '2026-11-17',
  },
  ky: {
    date: '2027-05-18',
    name: 'Primary Election',
    sourceUrl: 'https://elect.ky.gov/Pages/default.aspx',
    snippet: 'May 18, 2027 - Primary Election Day',
    checked: '2026-11-17',
  },
  mn: {
    date: '2028-03-07',
    name: 'Presidential Nomination Primary',
    sourceUrl: 'https://www.sos.mn.gov/elections-voting/how-elections-work/presidential-primary/',
    snippet: 'The next presidential primary will be on March 7, 2028.',
    checked: '2026-11-17',
  },
  nv: {
    date: '2028-02-01',
    name: 'Presidential Preference Primary Election',
    sourceUrl: 'https://www.leg.state.nv.us/App/InterimCommittee/REL/Document/33790',
    snippet: 'February 1, 2028 Presidential Preference Primary Election',
    checked: '2026-11-17',
  },
  vt: {
    date: '2028-03-07',
    name: 'Major Party Presidential Primary',
    sourceUrl: 'https://sos.vermont.gov/elections/election-info-resources/candidates/presidential-candidates',
    snippet: 'Major Party Primary- March 7, 2028',
    checked: '2026-11-17',
  },
};

/** Today as YYYY-MM-DD in Eastern time. Midnight Eastern is about when the last polls close (Hawaii and
 *  Alaska), so an election stays "next" until voting has ended everywhere, and no later. */
export function todayEastern(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** The state's next election, or null when none is listed or the listed one has passed. */
export function nextElection(code: string, today = todayEastern()): NextElection | null {
  const e = NEXT_ELECTIONS[code];
  return e && e.date >= today ? e : null;
}

/** "Tuesday, March 7, 2028". Dates are calendar days, so they are read in UTC to avoid a shift. */
export function electionDay(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** D.C. is not a state, so its whole-city elections are districtwide. */
export function scope(code: string): string {
  return code === 'dc' ? 'districtwide' : 'statewide';
}

/** "sos.ca.gov", shown as the source's name. */
export function sourceHost(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

/** The question and answer for a state page, or null when no official date is listed. */
export function nextElectionFaq(code: string, today = todayEastern()): { q: string; a: string } | null {
  const e = nextElection(code, today);
  if (!e) return null;
  const name = code === 'dc' ? 'the District of Columbia' : STATES[code];
  return {
    q: `When is my next election in ${name}?`,
    a: `The next ${scope(code)} election on ${name}’s official calendar is the ${e.name} on ${electionDay(e.date)}, according to ${sourceHost(e.sourceUrl)}. ${code === 'dc' ? 'A special election can be added before then.' : 'A special election can be added before then, and local elections can come sooner, so check your county or city elections office too.'} Official candidate lists are posted after filing closes, and Plain Ballot will quote the candidates then.`,
  };
}
