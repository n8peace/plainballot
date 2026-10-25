import { describe, expect, it, vi } from 'vitest';

// Google's ballot data returned stale contests (old measures, no candidates) and hid our
// researched races. Research must come first.
vi.mock('../lib/address/census', () => ({
  locate: vi.fn(async () => ({ matchedAddress: '589 MAUREEN LN, PLEASANT HILL, CA', state: 'CA', districts: [{ key: 'ca/state', label: 'California' }, { key: 'ca/cd-10', label: 'U.S. House District 10' }] })),
}));
vi.mock('../lib/ballot/google-civic', async (orig) => ({
  ...(await orig<typeof import('../lib/ballot/google-civic')>()),
  lookupGoogleCivic: vi.fn(async () => ({ electionName: 'x', electionDate: '2026-11-03', place: '', sample: false, contests: [{ id: '1a', kind: 'measure', office: '1A-Transportation Funding', sub: 'Yes or No', issues: [], choices: [], researched: false }] })),
}));
vi.mock('../lib/ballot/positions', async (orig) => ({
  ...(await orig<typeof import('../lib/ballot/positions')>()),
  contestsForDivisions: vi.fn(async () => [{ id: 'gov', kind: 'candidate', office: 'Governor', sub: 'Vote for one', issues: ['tax'], choices: [{ id: 'a', name: 'A', stances: {} }], researched: true }]),
}));

describe('ballot lookup order', () => {
  it('shows researched races even when Google returns other contests', async () => {
    process.env.GOOGLE_CIVIC_API_KEY = 'test';
    const { getBallot } = await import('../lib/ballot');
    const b = await getBallot('589 Maureen Ln, Pleasant Hill, CA 94523');
    expect(b.sample).toBe(false);
    expect(b.contests.map((c) => c.office)).toEqual(['Governor']);
  });
});
