import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({ title: 'Privacy · Plain Ballot', description: 'What happens to your address, your words and your choices on Plain Ballot.', path: '/privacy' });

export default function Privacy() {
  return (
    <div className="wrap prose">
      <p className="back"><Link href="/">← Back to your ballot</Link></p>
      <h1 className="wordmark" style={{ fontSize: 44, textAlign: 'left' }}>Privacy</h1>
      <hr className="double" />
      <p>Plain Ballot is free, with no ads and no account.</p>
      <ul>
        <li><b>Your address.</b> We use it only to find your ballot. To do that, it goes to the U.S. Census Bureau’s address lookup and Google’s Civic Information service, and while you type, to an address-suggestion service (Google Places or Photon). We don’t store it.</li>
        <li><b>Your own words.</b> If you describe your priorities in your own words, the text goes to an AI model through Vercel’s AI Gateway, with no copy kept by the provider. We don’t store it.</li>
        <li><b>Your choices.</b> Your issues and dial settings stay in your browser. We don’t store them.</li>
        <li><b>What we count.</b> Page visits, how many people look up a ballot (by state only), and which post a link came from when it carries a tag like ?ref=li-1102. We use Vercel Web Analytics, which sets no cookies. Your browser keeps one note that you’ve looked this election, and one for light or dark mode.</li>
        <li><b>AI assistants.</b> When an AI assistant looks up a ballot through our tool, the address is handled the same way. We count those lookups by state and by which AI app sent them.</li>
      </ul>
      <p>Questions: <a href="mailto:support@bananaintelligence.ai">support@bananaintelligence.ai</a></p>
    </div>
  );
}
