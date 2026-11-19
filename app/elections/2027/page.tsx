import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { longDate } from '@/lib/ballot/state-races';
import { PAGE_2027, anchor2027, changed2027, count2027, faq2027, states2027 } from '@/lib/elections-2027';
import { electionDay, sourceHost } from '@/lib/next-election';
import { SITE_URL } from '@/lib/share';
import { STATES, stateSlug } from '@/lib/states';
import '../../paper.css';

const title = 'Which states vote in 2027? · Plain Ballot';
const description = 'Every 2027 election that covers a whole state or D.C., from official election calendars, with what is on the ballot when the source says, and a link to each source.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: PAGE_2027 },
  openGraph: { title, description, url: PAGE_2027 },
  twitter: { title, description },
};

export default function Elections2027() {
  const states = states2027();
  const updated = changed2027()!;
  const q = faq2027();
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Which states vote in 2027?',
      description,
      url: PAGE_2027,
      inLanguage: 'en-US',
      dateModified: updated,
      isPartOf: { '@type': 'WebSite', name: 'Plain Ballot', url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } }],
    },
  ];

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
          <p className="pp-meta">Elections in 2027 · Updated <time dateTime={updated}>{longDate(updated)}</time></p>
          <h1 className="pp-headline sm">Which states vote in 2027?</h1>
          <p className="pp-deck sm">
            {count2027(states.map((s) => s.code))} hold an election in 2027 that covers the whole state or district, on their official election calendars. Every date and office below comes from an official government page, linked beside it. No candidates are listed until the state publishes them.
          </p>
        </div>
        {states.map((s) => (
          <section key={s.code} id={anchor2027(s.code)} className="pp-state-section">
            <h2 className="pp-kicker">{STATES[s.code]}</h2>
            <ul className="pp-state-list pp-elections">
              {s.elections.map((e) => (
                <li key={e.date}>
                  <span>{e.name}, {electionDay(e.date)}</span>
                  <span className="pp-state-choices">
                    {e.offices.length ? `On the ballot: ${e.offices.join(', ')}` : /runoff/i.test(e.name) ? 'Only races that need a runoff' : 'The source does not list the offices'}
                    {' · '}Source: <a href={e.sourceUrl}>{sourceHost(e.sourceUrl)}</a>
                    {e.officesSourceUrl && e.officesSourceUrl !== e.sourceUrl && <>, <a href={e.officesSourceUrl}>{sourceHost(e.officesSourceUrl)}</a></>}
                    {e.lawUrl && <>; state law: <a href={e.lawUrl}>{sourceHost(e.lawUrl)}</a></>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="pp-meta"><Link href={`/races/${stateSlug(s.code)}`}>{STATES[s.code]} races from 2026</Link></p>
          </section>
        ))}
        <section className="pp-faq" aria-labelledby="faq-2027">
          <h2 id="faq-2027">Questions</h2>
          <div className="pp-faq-list">
            <details open>
              <summary>{q.q}</summary>
              <p>{q.a}</p>
            </details>
          </div>
        </section>
        <p className="pp-meta">A state is listed only when its election office prints the date. Each date is rechecked against its source every week.</p>
        <p className="pp-race-return"><Link href="/">See every race on your ballot</Link></p>
      </main>
    </div>
  );
}
