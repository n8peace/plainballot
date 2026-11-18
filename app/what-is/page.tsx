import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { allContests } from '@/lib/ballot/data';
import { SITE_URL } from '@/lib/share';
import { TERMS, termExamples, termsHubChanged } from '@/lib/terms';
import '../paper.css';

const title = 'Ballot words · Plain Ballot';
const description = 'Short, plain answers to the ballot words voters look up, each from an official election source, with the real races that show it.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/what-is` },
  openGraph: { title, description, url: `${SITE_URL}/what-is` },
  twitter: { title, description },
};

export default async function BallotWords() {
  // Only words a real race on the site shows; the rest have no page.
  const contests = await allContests();
  const terms = TERMS.filter((t) => termExamples(t, contests).length > 0);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Ballot words',
    description,
    url: `${SITE_URL}/what-is`,
    inLanguage: 'en-US',
    dateModified: termsHubChanged(terms, contests),
    isPartOf: { '@type': 'WebSite', name: 'Plain Ballot', url: SITE_URL },
    hasPart: terms.map((t) => ({ '@type': 'WebPage', name: t.q, url: `${SITE_URL}/what-is/${t.slug}` })),
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
          <h1 className="pp-headline sm">Ballot words</h1>
          <p className="pp-deck sm">{description}</p>
        </div>
        <ul className="pp-state-list pp-state-index">
          {terms.map((t) => (
            <li key={t.slug}>
              <Link href={`/what-is/${t.slug}`}>{t.q}</Link>
              <span className="pp-state-choices">{t.name}</span>
            </li>
          ))}
        </ul>
        <p className="pp-race-return"><Link href="/">See every race on your ballot</Link></p>
      </main>
    </div>
  );
}
