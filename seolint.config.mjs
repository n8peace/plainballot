// Checks the built pages for search and social tags before every deploy (npm run build).
// Errors fail the build; warnings only print. Docs: https://seolint.io/docs/
export default {
  host: 'https://plainballot.com',
  inputs: ['.next/server/app'],
  // Not real pages: Next's error shells, and /paper, which only redirects home.
  ignore: ['_global-error.html', '_not-found.html', 'paper.html'],
  rules: {
    // robots.txt and sitemap.xml are served by route handlers (app/robots.ts, app/sitemap.ts), not files in this folder.
    'site.robots': false,
    'site.sitemap': false,
  },
};
