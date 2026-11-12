import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HOME_TITLE, SHARE_IMAGE, SITE_DESCRIPTION, homeJsonLd, pageMetadata } from '../lib/seo';
import { SITE_URL } from '../lib/share';

describe('search basics', () => {
  it('home title carries the words voters search for and fits in a result', () => {
    expect(HOME_TITLE).toMatch(/^Plain Ballot/);
    expect(HOME_TITLE.toLowerCase()).toContain('nonpartisan');
    expect(HOME_TITLE.toLowerCase()).toContain('voter guide');
    expect(HOME_TITLE.length).toBeLessThanOrEqual(60);
  });

  it('home page has a canonical link and the layout does not', () => {
    expect(readFileSync('app/page.tsx', 'utf8')).toContain("pageMetadata({ title: HOME_TITLE, path: '/' })");
    expect(readFileSync('app/layout.tsx', 'utf8')).not.toContain('canonical');
  });

  it('tags the site and the organization behind it', () => {
    const graph = homeJsonLd()['@graph'];
    const org = graph.find((n) => n['@type'] === 'Organization')!;
    const site = graph.find((n) => n['@type'] === 'WebSite') as Record<string, unknown>;
    expect(org.url).toBe(SITE_URL);
    expect(org.name).toBe('Plain Ballot');
    expect(site.url).toBe(SITE_URL);
    expect(site.description).toBe(SITE_DESCRIPTION);
    expect(site.publisher).toEqual({ '@id': org['@id'] });
  });

  it('makes no claim of being first, best or endorsed', () => {
    const text = JSON.stringify(homeJsonLd()) + HOME_TITLE;
    expect(text).not.toMatch(/\b(first|best|official|endorse)/i);
  });

  it('every page gets its own canonical link and social tags, with the share image', () => {
    const m = pageMetadata({ title: 'Terms · Plain Ballot', description: 'The terms.', path: '/terms' });
    expect(m.alternates?.canonical).toBe('/terms');
    expect(m.openGraph).toMatchObject({ title: 'Terms · Plain Ballot', url: '/terms', images: [SHARE_IMAGE] });
    expect(m.twitter).toMatchObject({ title: 'Terms · Plain Ballot', images: [SHARE_IMAGE] });
  });

  it('the build fails on SEO errors (seolint runs after next build)', () => {
    expect(JSON.parse(readFileSync('package.json', 'utf8')).scripts.build).toBe('next build && seolint');
  });
});
