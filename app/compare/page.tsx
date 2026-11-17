import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { articleJsonLd, citablePage } from '@/lib/citable';
import { COMPARE_FAQ } from '@/lib/compare';
import { DATA_REPO_URL } from '@/lib/share';

const page = citablePage('/compare');

export const metadata: Metadata = pageMetadata({ title: page.title, description: page.description, path: page.path });

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [{ '@type': 'Question', name: COMPARE_FAQ.q, acceptedAnswer: { '@type': 'Answer', text: COMPARE_FAQ.a } }],
};

// Each guide is described only by what its own site says, linked, with no ranking and no criticism.
export default function Compare() {
  return (
    <div className="wrap prose">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(page)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <p className="back"><Link href="/">← Back to your ballot</Link></p>
      <h1 className="wordmark" style={{ fontSize: 'clamp(32px, 10vw, 44px)', textAlign: 'left', textWrap: 'balance' }}>{COMPARE_FAQ.q}</h1>
      <hr className="double" />
      <p>Use them too. Each of these guides does something well, and a voter is better off with more than one.</p>
      <ul>
        <li><b><a href="https://ballotpedia.org">Ballotpedia</a></b> is a nonprofit whose staff writers and researchers cover politics at all levels of government (<a href="https://news.ballotpedia.org/about">its about page</a>).</li>
        <li><b><a href="https://www.vote411.org">VOTE411</a></b> is run by the League of Women Voters Education Fund. It offers ballot lookup, candidate information and voter resources (<a href="https://www.vote411.org/about">its about page</a>).</li>
        <li><b><a href="https://www.ballotready.org">BallotReady</a></b> covers races across the country, down to local offices. It shows candidates’ issue stances in their own words from their campaign websites, and links its sources (<a href="https://www.ballotready.org/research-process">its research process</a>).</li>
      </ul>
      <p>What Plain Ballot does differently:</p>
      <ul>
        <li><b>It starts from your issues.</b> You pick the issues that matter to you and where you stand, and each race shows whose quoted positions are closest to yours and why.</li>
        <li><b>Every quote is checked by code.</b> Each position has an exact quote and a link to its source. Every quote is checked word for word against its source, and checked again every night.</li>
        <li><b>It never fills a gap.</b> When there is no quote, the issue is left blank. Nothing is filled in from party or endorsements, and a blank never counts against anyone.</li>
        <li><b>The data is open.</b> The research is <a href={DATA_REPO_URL}>a free, open dataset</a> anyone can use, and the site’s code is open source.</li>
        <li><b>Its coverage is narrower.</b> Every race in California, plus U.S. House and Senate races in all 50 states. For other races, the guides above cover more.</li>
      </ul>
      <p>The rules that never change: <Link href="/what-we-never-do">What we never do</Link>. How the checks work: <Link href="/methodology">How it works</Link>.</p>
    </div>
  );
}
