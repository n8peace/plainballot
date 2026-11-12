import type { Metadata } from 'next';
import { DATA_REPO_URL, GITHUB_URL, SITE_URL } from './share';

// What search engines read on the home page: a title with the words voters search for,
// and site and organization tags (tests/seo.test.ts).
export const HOME_TITLE = 'Plain Ballot · Free, nonpartisan voter guide';

// One promise everywhere: the hero line, this description, and the share image say the same thing.
export const SITE_DESCRIPTION =
  'Who’s on your ballot, and where they stand, what each candidate said or did, quoted exactly, with a link to every source. Free, nonpartisan, no account.';

export const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Plain Ballot',
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  sameAs: [GITHUB_URL, DATA_REPO_URL],
};

export function homeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATION,
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'Plain Ballot',
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: 'en-US',
        publisher: { '@id': ORGANIZATION['@id'] },
      },
    ],
  };
}

/** The site's share image (app/opengraph-image.tsx). */
export const SHARE_IMAGE = '/opengraph-image';

/** One page's tags: title, description, canonical link, and social tags with the page's own URL. */
export function pageMetadata({ title, description = SITE_DESCRIPTION, path }: { title: string; description?: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    // A page that sets its own social tags loses the inherited share image, so name it here.
    openGraph: { title, description, url: path, siteName: 'Plain Ballot', type: 'website', images: [SHARE_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, creator: '@n8peace', images: [SHARE_IMAGE] },
  };
}
