import { describe, expect, it } from 'vitest';
import { pacificDayBefore, pacificMidnight } from '../lib/pacific-day';

describe('pacific days', () => {
  it('finds midnight in standard and daylight time', () => {
    expect(pacificMidnight('2026-11-19').toISOString()).toBe('2026-11-19T08:00:00.000Z');
    expect(pacificMidnight('2026-07-04').toISOString()).toBe('2026-07-04T07:00:00.000Z');
    // The days the clocks change.
    expect(pacificMidnight('2026-03-08').toISOString()).toBe('2026-03-08T08:00:00.000Z');
    expect(pacificMidnight('2026-11-01').toISOString()).toBe('2026-11-01T07:00:00.000Z');
  });

  it('counts back from the Pacific day, not the UTC day', () => {
    // 5pm Pacific on Nov 19 is already Nov 20 in UTC.
    const now = new Date('2026-11-20T01:00:00Z');
    expect(pacificDayBefore(now, 1)).toBe('2026-11-18');
    expect(pacificDayBefore(now, 7)).toBe('2026-11-12');
    expect(pacificDayBefore(new Date('2027-01-01T05:00:00Z'), 1)).toBe('2026-12-30');
  });
});
