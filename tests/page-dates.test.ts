import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { CITABLE_PAGES, RELEASES, pageUpdated } from '../lib/citable';
import { lastChanged, newest } from '../lib/page-dates';

const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() !== 'false';

describe('page dates come from history, not typing', () => {
  it('newest picks the latest date and skips missing ones', () => {
    expect(newest('2026-11-02', undefined, '2026-11-12', '2026-11-10')).toBe('2026-11-12');
    expect(newest(undefined)).toBeUndefined();
  });

  it('a path git has never seen has no date', () => {
    expect(lastChanged(['no/such/path'])).toBeUndefined();
  });

  it.skipIf(shallow)('a real page gets the day of its last commit', () => {
    const expected = execFileSync('git', ['log', '-1', '--format=%cs', '--', 'app/methodology'], { encoding: 'utf8' }).trim();
    expect(lastChanged(['app/methodology'])).toBe(expected);
  });

  it('a shallow clone gives no date instead of a wrong one', () => {
    if (shallow) expect(lastChanged(['app/methodology'])).toBeUndefined();
  });

  it('every citable page names files that exist, and its date is never older than its fallback', () => {
    for (const page of CITABLE_PAGES) {
      expect(page.sources.length).toBeGreaterThan(0);
      expect(pageUpdated(page) >= page.updated).toBe(true);
    }
  });

  it('the release log is dated by its newest entry', () => {
    const page = CITABLE_PAGES.find((p) => p.path === '/releases')!;
    expect(pageUpdated(page) >= RELEASES[0].date).toBe(true);
  });
});
