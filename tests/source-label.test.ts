import { describe, expect, it } from 'vitest';
import { sourceLabel } from '../lib/source-label';

describe('sourceLabel', () => {
  it('names an ordinary source by its site', () => {
    expect(sourceLabel('https://www.robbonta.com/issues')).toBe('robbonta.com');
  });

  it('names an archived copy by the original site', () => {
    expect(sourceLabel('https://web.archive.org/web/20261001011252/https://stefanyshaheen.com/priorities/')).toBe('stefanyshaheen.com (archived copy)');
    expect(sourceLabel('https://web.archive.org/web/20261001011252id_/http://www.example.org/a')).toBe('example.org (archived copy)');
  });

  it('is empty for a missing or broken URL', () => {
    expect(sourceLabel(undefined)).toBe('');
    expect(sourceLabel('not a url')).toBe('');
  });
});
