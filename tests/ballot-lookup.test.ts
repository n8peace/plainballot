import { describe, expect, it, vi } from 'vitest';

// The Census district lookup is down: the voter should get a clear "try again" message,
// not a sample ballot that claims their districts were found.
vi.mock('../lib/address/census', () => ({ locate: vi.fn(async () => { throw new Error('502 Bad Gateway'); }) }));

describe('ballot lookup when the district service is down', () => {
  it('asks the voter to try again instead of showing a misleading sample', async () => {
    const { getBallot, BallotLookupError } = await import('../lib/ballot');
    await expect(getBallot('600 Dexter Ave, Montgomery, AL 36104')).rejects.toBeInstanceOf(BallotLookupError);
    await expect(getBallot('600 Dexter Ave, Montgomery, AL 36104')).rejects.toThrow(/try again/);
  });
});
