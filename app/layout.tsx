import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Libre_Franklin, Newsreader } from 'next/font/google';
import { SITE_URL } from '@/lib/share';
import './globals.css';

const newsreader = Newsreader({ variable: '--font-newsreader', subsets: ['latin'], style: ['normal', 'italic'], weight: ['400', '500', '600'] });
const franklin = Libre_Franklin({ variable: '--font-franklin', subsets: ['latin'], weight: ['400', '500', '600', '700'] });

const description =
  'Match every race on your ballot to your own priorities, from Congress to school board, and see exactly why. Free, open source, nonpartisan.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Plain Ballot',
  description,
  openGraph: { title: 'Plain Ballot', description, siteName: 'Plain Ballot', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Plain Ballot', description, creator: '@n8peace' },
};

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#131313' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${franklin.variable}`}>
      <body>
        {children}
        {/* Cookie-free page counts on Vercel; nothing personal is collected. */}
        <Analytics />
      </body>
    </html>
  );
}
