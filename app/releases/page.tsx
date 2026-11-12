import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { RELEASES, articleJsonLd, citablePage } from '@/lib/citable';
import { GITHUB_URL } from '@/lib/share';

const page = citablePage('/releases');

export const metadata: Metadata = pageMetadata({ title: page.title, description: page.description, path: page.path });

export default function Releases() {
  return (
    <div className="wrap prose">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(page)) }} />
      <p className="back"><Link href="/">← Back to your ballot</Link></p>
      <h1 className="wordmark" style={{ fontSize: 44, textAlign: 'left' }}>Release log</h1>
      <hr className="double" />
      <p>Every change voters can see, newest first. The full history, line by line, is public at <a href={GITHUB_URL}>{GITHUB_URL.replace('https://', '')}</a>.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>What shipped</th><th>Why</th></tr></thead>
          <tbody>
            {RELEASES.map((r) => (
              <tr key={`${r.date}-${r.what}`}><td style={{ whiteSpace: 'nowrap' }}>{r.date}</td><td>{r.what}</td><td>{r.why}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
