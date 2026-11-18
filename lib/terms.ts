// Short answer pages for the ballot words voters look up. Each answer is in plain words, cites one
// official government page (the snippet is that page's exact words, checked by npm run check:terms),
// and lists the real races on Plain Ballot that show the term. No races, no page.
import type { RawContest } from './ballot/data';
import { raceShareUrl, SITE_URL } from './share';
import { newest } from './page-dates';

export type Term = {
  slug: string;
  /** The question, word for word as a voter asks it. */
  q: string;
  /** The term itself, for links and the page's kicker. */
  name: string;
  /** Plain-words answer, nothing beyond what the source supports. */
  answer: string;
  /** An official page that defines the term. */
  sourceUrl: string;
  /** Exact words from that page. */
  snippet: string;
  /** YYYY-MM-DD, the day the snippet was last matched on the page. */
  checked: string;
  /** YYYY-MM-DD, the day the answer went up or last changed. Bump it when the answer or source changes. */
  since: string;
  /** Heading over the list of real races that show the term. */
  examplesTitle: string;
  /** Which researched races show the term. */
  shows: (c: RawContest) => boolean;
};

const state = (c: RawContest) => String(c.division ?? '').split('/')[0];
const choices = (c: RawContest) => (Array.isArray(c.choices) ? (c.choices as { name?: unknown; party?: unknown }[]) : []);
// The id is the measure's title as a slug ("proposition-1-authorizes-bonds-for-..."), so it counts too.
const text = (c: RawContest) => `${String(c.id ?? '').replace(/-/g, ' ')} ${String(c.office ?? '')} ${String(c.summary ?? '')}`;

/** "Democratic Party", "DEM" and "Democrat" are one party preference; blank and no-preference labels are none. */
export function partyKey(party: unknown): string {
  const p = String(party ?? '').trim().toLowerCase().replace(/\s+party$/, '');
  if (!p || /^(np|npp|no party preference|nonpartisan|independent|none)$/.test(p)) return '';
  if (/^dem/.test(p)) return 'democratic';
  if (/^rep/.test(p)) return 'republican';
  return p;
}

/** Two or more finalists, all with the same party preference. */
export function sameParty(c: RawContest): boolean {
  const keys = choices(c).map((ch) => partyKey(ch.party));
  return keys.length >= 2 && keys[0] !== '' && keys.every((k) => k === keys[0]);
}

export const TERMS: Term[] = [
  {
    slug: 'ballot-measure',
    q: 'What is a ballot measure?',
    name: 'Ballot measure',
    answer: 'A ballot measure is a question put directly to voters, instead of a person running for office. In California, the Legislature can place constitutional amendments, bond measures and changes in law on the ballot, and voters can place an initiative or a referendum there by gathering signatures. A statewide measure passes with a majority of the votes. Some local measures need 55% or two-thirds.',
    sourceUrl: 'https://www.sos.ca.gov/elections/ballot-measures',
    snippet: 'There are two ways a measure can be placed on the ballot. The Legislature has the ability to place constitutional amendments, bond measures, and proposed changes in law on the ballot.',
    checked: '2026-11-17',
    since: '2026-11-17',
    examplesTitle: 'Ballot measures on Plain Ballot',
    shows: (c) => c.kind === 'measure',
  },
  {
    slug: 'top-two-primary',
    q: 'Why are two candidates from the same party on my ballot?',
    name: 'Top-two primary',
    answer: 'In California, every voter can pick any candidate in the primary for most state and congressional offices. The two candidates with the most votes move on to November, even if both listed the same party preference.',
    sourceUrl: 'https://www.sos.ca.gov/elections/voter-nominated-offices',
    snippet: 'The top two vote-getters at the primary election advance to the general election for the voter-nominated office, even if both candidates have specified the same party preference designation.',
    checked: '2026-11-17',
    since: '2026-11-17',
    examplesTitle: 'California races with two candidates of the same party preference',
    shows: (c) => state(c) === 'ca' && c.kind === 'candidate' && sameParty(c),
  },
  {
    slug: 'bond-measure',
    q: 'What is a bond measure?',
    name: 'Bond measure',
    answer: 'A bond is a way a government borrows money and then pays it back, plus interest, over time. A bond measure asks voters to approve that borrowing for a stated purpose, such as building or repairing schools.',
    sourceUrl: 'https://lao.ca.gov/BallotAnalysis/Proposition?number=2&year=2024',
    snippet: 'Bonds are a way that the state borrows money and then repays the money plus interest over time.',
    checked: '2026-11-17',
    since: '2026-11-17',
    examplesTitle: 'Bond measures on Plain Ballot',
    shows: (c) => c.kind === 'measure' && /\bbonds?\b/i.test(text(c)),
  },
];

export function term(slug: string): Term | undefined {
  return TERMS.find((t) => t.slug === slug);
}

export function termUrl(slug: string): string {
  return `${SITE_URL}/what-is/${slug}`;
}

export interface TermExample { name: string; path: string; place: string }

/** The real races that show a term: statewide first, then by name, district 2 before district 10. */
export function termExamples(t: Term, contests: RawContest[]): TermExample[] {
  const out: (TermExample & { statewide: boolean })[] = [];
  for (const c of contests) {
    if (!t.shows(c)) continue;
    let path: string;
    try {
      path = new URL(raceShareUrl(String(c.division), String(c.id))).pathname;
    } catch {
      continue; // a malformed id never makes a broken link
    }
    out.push({ name: [c.office, c.district].filter(Boolean).join(', '), path, place: state(c), statewide: String(c.division ?? '').endsWith('/state') });
  }
  return out
    .sort((a, b) => Number(b.statewide) - Number(a.statewide) || a.name.localeCompare(b.name, 'en', { numeric: true }))
    .map((e) => ({ name: e.name, path: e.path, place: e.place }));
}

/** The day a term page last changed: its answer, or the newest research check among its races. */
export function termChanged(t: Term, contests: RawContest[]): string {
  const checks = contests.filter(t.shows).map((c) => String(c.checkedAt ?? '')).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  return newest(t.since, ...checks)!;
}

/** The hub's date: the newest change to any term page it lists. */
export function termsHubChanged(terms: Term[], contests: RawContest[]): string | undefined {
  return newest(...terms.map((t) => termChanged(t, contests)));
}

/** The terms a race shows, for links on its page. */
export function termsFor(c: RawContest): Term[] {
  return TERMS.filter((t) => t.shows(c));
}

/** Structured data: the question and answer, its place under Plain Ballot, and its date. */
export function termJsonLd(t: Term, updated: string) {
  const url = termUrl(t.slug);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: t.q,
      description: t.answer,
      url,
      inLanguage: 'en-US',
      dateModified: updated,
      isPartOf: { '@type': 'WebSite', name: 'Plain Ballot', url: SITE_URL },
      citation: t.sourceUrl,
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Plain Ballot', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Ballot words', item: `${SITE_URL}/what-is` },
          { '@type': 'ListItem', position: 3, name: t.name, item: url },
        ],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: t.q, acceptedAnswer: { '@type': 'Answer', text: t.answer } }],
    },
  ] as const;
}

export { text as termText, state as termState };
