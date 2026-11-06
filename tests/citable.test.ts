import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITABLE_PAGES, RELEASES, articleJsonLd } from '../lib/citable';
import { SITE_URL } from '../lib/share';

const llms = readFileSync('public/llms.txt', 'utf8');
const sitemapSrc = readFileSync('app/sitemap.ts', 'utf8'); // imports '@/', which vitest can't resolve

describe('citable pages', () => {
  for (const page of CITABLE_PAGES) {
    const file = `app${page.path}/page.tsx`;

    it(`${page.path} has a page, a sitemap line and an llms.txt line`, () => {
      expect(existsSync(file)).toBe(true);
      expect(sitemapSrc).toContain(`url: \`${'${SITE_URL}'}${page.path}\``);
      expect(llms).toContain(`(https://plainballot.com${page.path})`);
    });

    it(`${page.path} sets a canonical link and Article tags`, () => {
      const src = readFileSync(file, 'utf8');
      expect(src).toContain(`citablePage('${page.path}')`);
      expect(src).toContain('canonical: page.path');
      expect(src).toContain('articleJsonLd(page)');
    });
  }

  it('Article tags name the page, its URL and the publisher', () => {
    const ld = articleJsonLd(CITABLE_PAGES[0]);
    expect(ld['@type']).toBe('Article');
    expect(ld.headline).toBe(CITABLE_PAGES[0].title);
    expect(ld.url).toBe(`${SITE_URL}${CITABLE_PAGES[0].path}`);
    expect(ld.publisher.name).toBe('Plain Ballot');
    expect(ld.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('release log', () => {
  it('every entry has a date, what shipped and why', () => {
    for (const r of RELEASES) {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.what.length).toBeGreaterThan(5);
      expect(r.why.length).toBeGreaterThan(5);
    }
  });

  it('is newest first', () => {
    const dates = RELEASES.map((r) => r.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
