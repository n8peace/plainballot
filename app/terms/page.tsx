import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({ title: 'Terms · Plain Ballot', description: 'The terms for using Plain Ballot, a free, nonpartisan ballot guide.', path: '/terms' });

export default function Terms() {
  return (
    <div className="wrap prose">
      <p className="back"><Link href="/">← Back to your ballot</Link></p>
      <h1 className="wordmark" style={{ fontSize: 44, textAlign: 'left' }}>Terms</h1>
      <hr className="double" />
      <ul>
        <li>Plain Ballot is free to use. It never tells you how to vote.</li>
        <li>We work to get every position right, with an exact quote and source behind it. Information can still be incomplete or out of date. For official ballot details, check your county elections office.</li>
        <li>A blank means we couldn’t find a sourced position. It isn’t a position for or against.</li>
        <li>The service is provided as is, without warranties.</li>
        <li>The research is open data under the ODbL. The site’s code is open source under the AGPL.</li>
        <li>Found something wrong? Tap “Not right?” on any claim, or write to <a href="mailto:support@bananaintelligence.ai">support@bananaintelligence.ai</a>.</li>
      </ul>
    </div>
  );
}
