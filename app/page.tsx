import type { Metadata } from 'next';
import { Paper } from '@/components/Paper';
import { SAMPLE_BALLOT } from '@/lib/ballot/sample';
import { HOME_TITLE, homeJsonLd, pageMetadata } from '@/lib/seo';
import { faqJsonLd } from '@/lib/faq';
import './paper.css';

// Canonical here, not in the layout: a layout canonical would point every page at the home page.
export const metadata: Metadata = pageMetadata({ title: HOME_TITLE, path: '/' });

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd()).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()).replace(/</g, '\\u003c') }} />
      <Paper sample={SAMPLE_BALLOT} />
    </>
  );
}
