import { describe, expect, it } from 'vitest';
import { findContest } from '../lib/ballot/race-share';
import { decodeDivision, encodeDivision, raceShareUrl } from '../lib/share';
import type { Contest } from '../lib/types';

const fixture: Contest[] = [
  {
    id: 'u-s-house-california-district-10',
    division: 'ca/cd-10',
    kind: 'candidate',
    office: 'U.S. House',
    sub: 'California District 10 · Vote for one',
    issues: [],
    choices: [],
    researched: true,
  },
];

describe('race share links', () => {
  it('builds an address-free URL from only a division and contest id', () => {
    const url = raceShareUrl('ca/cd-10', 'u-s-house-california-district-10');
    expect(url).toMatch(/^https:\/\/plainballot\.com\/r\/[a-z]{2}~[a-z0-9-]+\/[a-z0-9-]+$/);
    expect(url).not.toMatch(/[?&#=]|street|address|housing2h|pick/i);
  });

  it('round-trips the research division encoding', () => {
    expect(decodeDivision(encodeDivision('ca/cd-10'))).toBe('ca/cd-10');
    expect(decodeDivision('ca/cd-10')).toBeNull();
  });

  it('returns null for an unknown contest without loading data', () => {
    expect(findContest(fixture, 'governor-california')).toBeNull();
    expect(findContest(fixture, 'u-s-house-california-district-10')).toBe(fixture[0]);
  });
});
