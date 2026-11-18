import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { allContests } from '@/lib/ballot/data';
import { longDate } from '@/lib/ballot/state-races';
import { sourceHost } from '@/lib/next-election';
import { STATES } from '@/lib/states';
import { TERMS, term, termChanged, termExamples, termJsonLd, termUrl } from '@/lib/terms';
import '../../paper.css';

export function generateStaticParams() {
  return TERMS.map((t) => ({ term: t.slug }));
}

const load = cache(async (slug: string) => {
  const t = term(slug);
  if (!t) return null;
  const contests = await allContests();
  const examples = termExamples(t, contests);
  // No real race on the site shows this word: no page.
  // Link only to the other words that have a page.
  const others = TERMS.filter((o) => o.slug !== t.slug && termExamples(o, contests).length > 0);
  return examples.length ? { t, examples, others, updated: termChanged(t, contests) } : null;
});

export async function generateMetadata({ params }: PageProps<'/what-is/[term]'>): Promise<Metadata> {
  const page = await load((await params).term);
  if (!page) return { title: 'Not found · Plain Ballot', robots: { index: false } };
  const title = `${page.t.q} · Plain Ballot`;
  const description = page.t.answer;
  const url = termUrl(page.t.slug);
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url }, twitter: { title, description } };
}

export default async function TermPage({ params }: PageProps<'/what-is/[term]'>) {
  const page = await load((await params).term);
  if (!page) notFound();
  const { t, examples, others, updated } = page;
  // Name the state only when the list spans more than one.
  const manyStates = new Set(examples.map((e) => e.place)).size > 1;

  return (
    <div className="paper" id="top">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(termJsonLd(t, updated)).replace(/</g, '\\u003c') }} />
      <header className="pp-mast">
        <p className="pp-title"><Link href="/">Plain Ballot</Link></p>
        <span className="pp-promise">Free, with no ads and no account</span>
        <ThemeToggle />
      </header>
      <main className="pp-edition">
        <div className="pp-edition-head">
          <p className="pp-meta"><Link href="/what-is">Ballot words</Link> · {t.name} · Updated <time dateTime={updated}>{longDate(updated)}</time></p>
          <h1 className="pp-headline sm">{t.q}</h1>
          <p className="pp-deck sm">{t.answer}</p>
          <p className="pp-meta">Source: <a href={t.sourceUrl}>{sourceHost(t.sourceUrl)}</a>, which says: “{t.snippet}”</p>
        </div>
        <section className="pp-state-section">
          <h2 className="pp-kicker">{t.examplesTitle} ({examples.length})</h2>
          <ul className="pp-state-list">
            {examples.map((e) => (
              <li key={e.path}>
                <Link href={e.path}>{e.name}</Link>
                {manyStates && e.place in STATES && <span className="pp-state-choices">{STATES[e.place]}</span>}
              </li>
            ))}
          </ul>
        </section>
        {others.length > 0 && (
          <section className="pp-state-section">
            <h2 className="pp-kicker">More ballot words</h2>
            <ul className="pp-state-list">
              {others.map((o) => (
                <li key={o.slug}><Link href={`/what-is/${o.slug}`}>{o.q}</Link></li>
              ))}
            </ul>
          </section>
        )}
        <p className="pp-race-return"><Link href="/">See every race on your ballot</Link></p>
      </main>
    </div>
  );
}
