import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { articleJsonLd, citablePage } from '@/lib/citable';
import { DATA_REPO_URL } from '@/lib/share';

const page = citablePage('/what-we-never-do');

export const metadata: Metadata = pageMetadata({ title: page.title, description: page.description, path: page.path });

export default function WhatWeNeverDo() {
  return (
    <div className="wrap prose">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(page)) }} />
      <p className="back"><Link href="/">← Back to your ballot</Link></p>
      <h1 className="wordmark" style={{ fontSize: 'clamp(32px, 10vw, 44px)', textAlign: 'left', textWrap: 'balance' }}>What we never do</h1>
      <hr className="double" />
      <p>Plain Ballot shows how each race on your ballot lines up with the issues you chose. These rules hold for every race, every candidate and every party.</p>
      <ul>
        <li><b>We never endorse.</b> No candidate, party or measure is recommended. The ballot shows fit with your own settings, not our view.</li>
        <li><b>We never tell anyone how to vote.</b> A close fit is a starting point for your own reading, not advice. Every match shows the reason and what would change it.</li>
        <li><b>We never guess from party or identity.</b> Positions are never filled in from a party label, an endorsement, who someone is, or what similar people believe. Party labels stay hidden until you ask.</li>
        <li><b>We never publish a claim without a checked quote.</b> Every position has an exact quote, fetched from its source and found there word for word. If we can’t find one, the issue is left blank, and a blank never counts against anyone.</li>
        <li><b>We never use AI to pick your matches.</b> Matching is plain arithmetic in your browser. The same settings always give the same ballot.</li>
        <li><b>We never slant the wording.</b> Each end of a dial is worded the way its own supporters would say it. Claims say what someone did or said, without praise or criticism.</li>
        <li><b>We never keep your address or your choices.</b> See <Link href="/privacy">Privacy</Link>.</li>
        <li><b>We never hide a correction.</b> Anyone can report a claim with “Not right?”. Reports and fixes are public at <a href={DATA_REPO_URL}>Open Election Data</a>.</li>
      </ul>
      <p>How the research and checks work: <Link href="/methodology">How it works</Link>. What changed and when: <Link href="/releases">Release log</Link>.</p>
    </div>
  );
}
