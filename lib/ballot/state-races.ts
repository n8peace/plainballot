import type { RawContest } from './data';
import { SITE_URL, raceShareUrl } from '../share';
import { STATES, stateSlug } from '../states';
import { nextElectionChanged, nextElectionFaq, todayEastern } from '../next-election';
import { newest } from '../page-dates';
import { changed2027 } from '../elections-2027';

export const ELECTION_DATE = process.env.ELECTION_DATE || '2026-11-03';

/** "November 3, 2026" */
export function longDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function statePageUrl(code: string): string {
  return `${SITE_URL}/races/${stateSlug(code)}`;
}

export interface RaceLink { name: string; url: string; choices: string[] }
export interface RaceSection { title: string; races: RaceLink[] }

// Fixed order, top of the ballot first. A race lands in the first section whose test it passes.
const SECTIONS: { title: string; test: (c: RawContest) => boolean }[] = [
  { title: 'Statewide', test: (c) => c.level === 'statewide' },
  { title: 'U.S. Senate', test: (c) => c.level === 'federal' && /senat/i.test(String(c.office)) },
  { title: 'U.S. House', test: (c) => c.level === 'federal' },
  { title: 'State legislature', test: (c) => c.level === 'legislature' },
  { title: 'Ballot measures', test: (c) => c.kind === 'measure' || c.level === 'measures' },
  { title: 'Other races', test: () => true },
];

/** The researched races in one state, grouped by ballot section, in district order. */
export function stateSections(contests: RawContest[], code: string): RaceSection[] {
  const mine = contests.filter((c) => String(c.division ?? '').split('/')[0] === code);
  const sections = SECTIONS.map((s) => ({ title: s.title, races: [] as RaceLink[] }));
  for (const c of mine) {
    let url: string;
    try {
      url = raceShareUrl(String(c.division), String(c.id));
    } catch {
      continue; // a malformed id never makes a broken link
    }
    const i = SECTIONS.findIndex((s) => s.test(c));
    const choices = Array.isArray(c.choices) ? c.choices.map((ch) => String((ch as { name?: unknown }).name ?? '')).filter(Boolean) : [];
    sections[i].races.push({ name: [c.office, c.district].filter(Boolean).join(', '), url, choices: c.kind === 'measure' ? [] : choices });
  }
  // District 2 before District 10. Choices inside each race keep the research data's order.
  for (const s of sections) s.races.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  return sections.filter((s) => s.races.length > 0);
}

/** Codes of the states with at least one researched race, in alphabetical order of name. */
export function statesCovered(contests: RawContest[]): string[] {
  const codes = new Set(contests.map((c) => String(c.division ?? '').split('/')[0]).filter((code) => code in STATES));
  return [...codes].sort((a, b) => STATES[a].localeCompare(STATES[b]));
}

/** The newest research check among one state's races (YYYY-MM-DD). */
export function stateUpdated(contests: RawContest[], code: string): string | undefined {
  return contests
    .filter((c) => String(c.division ?? '').split('/')[0] === code)
    .map((c) => String(c.checkedAt ?? ''))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .at(-1);
}

/** The day a state page last changed: its newest research check or its next-election line,
 *  whichever is later. Used for the page's dateModified and its sitemap date. */
export function statePageChanged(contests: RawContest[], code: string, today = todayEastern()): string | undefined {
  // State pages link to their own 2027 elections, so a change to those counts too.
  return newest(stateUpdated(contests, code), nextElectionChanged(code, today), changed2027(code));
}

/** "12 races and measures", "1 race", "3 measures": names only what the state has. */
export function raceCount(sections: RaceSection[]): string {
  const measures = sections.filter((s) => s.title === 'Ballot measures').reduce((n, s) => n + s.races.length, 0);
  const races = sections.reduce((n, s) => n + s.races.length, 0) - measures;
  const total = races + measures;
  const noun = measures && races ? 'races and measures' : measures ? (total === 1 ? 'measure' : 'measures') : total === 1 ? 'race' : 'races';
  return `${total} ${noun}`;
}

/** The question people ask, word for word, and an answer that says only what the page shows. */
export function stateFaq(code: string, sections: RaceSection[]) {
  const name = STATES[code];
  const parts = sections.map((s) => `${s.title} (${s.races.length})`).join(', ');
  return {
    q: `Who ran for office in ${name} in 2026, in their own words?`,
    a: `Plain Ballot researched ${raceCount(sections)} on ${name}’s ${longDate(ELECTION_DATE)} ballot: ${parts}. Each race page lists every choice with exact quotes and a link to each source. When our checks agree, a quote is marked as the candidate’s own words, a public record, or a description, not their words. Plain Ballot never endorses anyone, and these pages don’t show results.`,
  };
}

/** Structured data for a state page: the page, its place under Plain Ballot, and its questions. */
export function stateJsonLd(code: string, sections: RaceSection[], updated: string | undefined, today = todayEastern()) {
  const name = STATES[code];
  const url = statePageUrl(code);
  const faqs = [stateFaq(code, sections), nextElectionFaq(code, today)].filter((f) => f !== null);
  const page = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${name} races, ${longDate(ELECTION_DATE)}`,
    description: stateDescription(code, sections),
    url,
    inLanguage: 'en-US',
    ...(updated ? { dateModified: updated } : {}),
    isPartOf: { '@type': 'WebSite', name: 'Plain Ballot', url: SITE_URL },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Plain Ballot', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Races by state', item: `${SITE_URL}/races` },
        { '@type': 'ListItem', position: 3, name, item: url },
      ],
    },
  };
  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return [page, faqPage] as const;
}

export function stateDescription(code: string, sections: RaceSection[]): string {
  return `Every race Plain Ballot researched in ${STATES[code]} for ${longDate(ELECTION_DATE)}: ${raceCount(sections)}, each with exact, sourced quotes.`;
}
