import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { RaceStory } from '@/components/Paper';
import { ThemeToggle } from '@/components/ThemeToggle';
import { loadSharedRace, raceJsonLd, raceSummary } from '@/lib/ballot/race-share';
import type { Prefs } from '@/lib/types';
import '../../../paper.css';

const getRace = cache(loadSharedRace);
const EMPTY_PREFS: Prefs = { sel: [], pos: {}, imp: {} };
const ELECTION_DATE = process.env.ELECTION_DATE || '2026-11-03';

function longDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function generateMetadata({ params }: PageProps<'/r/[division]/[contest]'>): Promise<Metadata> {
  const { division, contest } = await params;
  const race = await getRace(division, contest);
  if (!race) return { title: 'Race not found · Plain Ballot', robots: { index: false } };
  const { name, description, url } = raceSummary(race);
  const title = `${name} · Plain Ballot`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { title, description },
  };
}

export default async function SharedRace({ params }: PageProps<'/r/[division]/[contest]'>) {
  const { division, contest } = await params;
  const race = await getRace(division, contest);
  if (!race) notFound();

  return (
    <div className="paper" id="top">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(raceJsonLd(race)).replace(/</g, '\\u003c') }} />
      <header className="pp-mast">
        <h1 className="pp-title"><Link href="/">Plain Ballot</Link></h1>
        <span className="pp-promise">Free, with no ads and no account</span>
        <ThemeToggle />
      </header>
      <main className="pp-edition">
        <div className="pp-edition-head">
          <p className="pp-meta">General Election · {longDate(ELECTION_DATE)}</p>
          <p className="pp-meta">Every position below is quoted exactly from its source.</p>
        </div>
        <RaceStory contest={race.contest} prefs={EMPTY_PREFS} showParty={false} showAllQuotes shareable={false} />
        <p className="pp-race-return"><Link href="/">See every race on your ballot</Link></p>
      </main>
    </div>
  );
}
