import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { allContests } from '@/lib/ballot/data';
import { ELECTION_DATE, longDate, raceCount, stateDescription, stateFaq, stateJsonLd, statePageUrl, statePageChanged, stateSections } from '@/lib/ballot/state-races';
import { STATES, stateFromSlug } from '@/lib/states';
import { electionDay, nextElection, nextElectionFaq, scope, sourceHost } from '@/lib/next-election';
import { anchor2027, has2027 } from '@/lib/elections-2027';
import '../../paper.css';

const load = cache(async (slug: string) => {
  const code = stateFromSlug(slug);
  if (!code) return null;
  const contests = await allContests();
  const sections = stateSections(contests, code);
  return sections.length ? { code, sections, updated: statePageChanged(contests, code) } : null;
});

export async function generateMetadata({ params }: PageProps<'/races/[state]'>): Promise<Metadata> {
  const page = await load((await params).state);
  if (!page) return { title: 'State not found · Plain Ballot', robots: { index: false } };
  const title = `${STATES[page.code]} races, ${longDate(ELECTION_DATE)} · Plain Ballot`;
  const description = stateDescription(page.code, page.sections);
  const url = statePageUrl(page.code);
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url }, twitter: { title, description } };
}

export default async function StateRaces({ params }: PageProps<'/races/[state]'>) {
  const page = await load((await params).state);
  if (!page) notFound();
  const name = STATES[page.code];
  const faq = stateFaq(page.code, page.sections);
  const next = nextElection(page.code);
  const nextFaq = nextElectionFaq(page.code);

  return (
    <div className="paper" id="top">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(stateJsonLd(page.code, page.sections, page.updated)).replace(/</g, '\\u003c') }} />
      <header className="pp-mast">
        <p className="pp-title"><Link href="/">Plain Ballot</Link></p>
        <span className="pp-promise">Free, with no ads and no account</span>
        <ThemeToggle />
      </header>
      <main className="pp-edition">
        <div className="pp-edition-head">
          <p className="pp-meta"><Link href="/races">Races by state</Link> · General Election · {longDate(ELECTION_DATE)}</p>
          <h1 className="pp-headline sm">{name}</h1>
          <p className="pp-deck sm">{raceCount(page.sections)}. Every position on these pages is quoted exactly from its source.</p>
          {next && (
            <p className="pp-meta pp-next">
              Next {scope(page.code)} election on the official calendar: {next.name}, {electionDay(next.date)} (<a href={next.sourceUrl}>{sourceHost(next.sourceUrl)}</a>)
            </p>
          )}
        </div>
        {page.sections.map((s) => (
          <section key={s.title} className="pp-state-section">
            <h2 className="pp-kicker">{s.title}</h2>
            <ul className="pp-state-list">
              {s.races.map((r) => (
                <li key={r.url}>
                  <Link href={r.url.replace(/^https:\/\/plainballot\.com/, '')}>{r.name}</Link>
                  {r.choices.length > 0 && <span className="pp-state-choices">{r.choices.join(' · ')}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="pp-faq" aria-labelledby="state-faq">
          <h2 id="state-faq">Questions</h2>
          <div className="pp-faq-list">
            <details open>
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
            {nextFaq && (
              <details open id="next-election">
                <summary>{nextFaq.q}</summary>
                <p>{nextFaq.a}</p>
              </details>
            )}
          </div>
          {has2027(page.code) && (
            <p className="pp-meta"><Link href={`/elections/2027#${anchor2027(page.code)}`}>Elections in {name} in 2027</Link></p>
          )}
        </section>
        <p className="pp-race-return"><Link href="/">See every race on your ballot</Link></p>
      </main>
    </div>
  );
}
