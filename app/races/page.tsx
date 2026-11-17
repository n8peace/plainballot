import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { allContests } from '@/lib/ballot/data';
import { ELECTION_DATE, longDate, raceCount, stateSections, statesCovered } from '@/lib/ballot/state-races';
import { SITE_URL } from '@/lib/share';
import { STATES, stateSlug } from '@/lib/states';
import '../paper.css';

const title = 'Races by state · Plain Ballot';
const description = `Every race Plain Ballot researched for ${longDate(ELECTION_DATE)}, by state, each with exact, sourced quotes.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/races` },
  openGraph: { title, description, url: `${SITE_URL}/races` },
  twitter: { title, description },
};

export default async function RacesByState() {
  const contests = await allContests();
  const states = statesCovered(contests).map((code) => ({ code, count: raceCount(stateSections(contests, code)) }));
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Races by state',
    description,
    url: `${SITE_URL}/races`,
    inLanguage: 'en-US',
    isPartOf: { '@type': 'WebSite', name: 'Plain Ballot', url: SITE_URL },
  };

  return (
    <div className="paper" id="top">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <header className="pp-mast">
        <p className="pp-title"><Link href="/">Plain Ballot</Link></p>
        <span className="pp-promise">Free, with no ads and no account</span>
        <ThemeToggle />
      </header>
      <main className="pp-edition">
        <div className="pp-edition-head">
          <p className="pp-meta">General Election · {longDate(ELECTION_DATE)}</p>
          <h1 className="pp-headline sm">Races by state</h1>
          <p className="pp-deck sm">Every race in California, plus U.S. House and Senate races in all 50 states. Every position is quoted exactly from its source.</p>
        </div>
        <ul className="pp-state-list pp-state-index">
          {states.map((s) => (
            <li key={s.code}>
              <Link href={`/races/${stateSlug(s.code)}`}>{STATES[s.code]}</Link>
              <span className="pp-state-choices">{s.count}</span>
            </li>
          ))}
        </ul>
        <p className="pp-race-return"><Link href="/">See every race on your ballot</Link></p>
      </main>
    </div>
  );
}
