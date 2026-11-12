import { describe, expect, it, vi } from 'vitest';
import boundaries from '../lib/address/ccd-boundaries.json';

vi.mock('server-only', () => ({}));

describe('California community college districts', () => {
  it('builds stable keys', async () => {
    const { ccdKey } = await import('../lib/address/ccd');
    expect(ccdKey('Mt. San Antonio')).toBe('ccd-mt-san-antonio');
    expect(ccdKey('Foothill-DeAnza')).toBe('ccd-foothill-deanza');
  });

  it('finds districts from longitude and latitude', async () => {
    const { ccdAt } = await import('../lib/address/ccd');
    expect(ccdAt(-122.3255, 37.5630)).toEqual({
      key: 'ccd-san-mateo-county',
      label: 'San Mateo County Community College District',
    });
    expect(ccdAt(-122.7141, 38.4405)).toEqual({
      key: 'ccd-sonoma-county',
      label: 'Sonoma County Junior College District',
    });
  });

  it('returns null outside California', async () => {
    const { ccdAt } = await import('../lib/address/ccd');
    expect(ccdAt(-119.8138, 39.5296)).toBeNull();
  });

  it('gives every district a unique key', async () => {
    const { ccdKey } = await import('../lib/address/ccd');
    const keys = boundaries.map(({ name }) => ccdKey(name));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
