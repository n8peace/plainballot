import type { Metadata } from 'next';
import { BallotApp } from '@/components/BallotApp';
import { SAMPLE_BALLOT } from '@/lib/ballot/sample';
import { decodePrefs } from '@/lib/share';

// A friend's shared dials: plainballot.com/d/housing2h.tax1m...
// The link carries only issue settings; no address, no picks.

export async function generateMetadata({ params }: PageProps<'/d/[code]'>): Promise<Metadata> {
  const prefs = decodePrefs(decodeURIComponent((await params).code));
  const title = prefs ? `What I care about this election (${prefs.sel.length} issues)` : 'Plain Ballot';
  const description = 'See where we agree, then get your whole ballot matched to your own priorities. Free and nonpartisan.';
  return { title, description, openGraph: { title, description }, twitter: { title, description } };
}

export default async function SharedDials({ params }: PageProps<'/d/[code]'>) {
  const friend = decodePrefs(decodeURIComponent((await params).code));
  return <BallotApp initialBallot={SAMPLE_BALLOT} friend={friend} />;
}
