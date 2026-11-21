import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getBallot: vi.fn(async (address: string) => ({ address, contests: [] })),
  checkBotId: vi.fn(async () => ({ isBot: false })),
}));

vi.mock('@/lib/ballot', () => ({
  BallotLookupError: class BallotLookupError extends Error {
    retryable = false;
  },
  getBallot: mocks.getBallot,
}));

vi.mock('botid/server', () => ({ checkBotId: mocks.checkBotId }));

vi.mock('@/lib/ratelimit', () => ({
  allow: vi.fn(() => true),
  clientIp: vi.fn(() => 'test'),
}));

import { GET, POST } from '../app/api/ballot/route';

describe('ballot route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a ballot from a POST JSON body', async () => {
    const req = new Request('http://localhost/api/ballot', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1' },
      body: JSON.stringify({ address: '  1315 10th St, Sacramento, CA 95814  ' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.json()).toEqual({ address: '1315 10th St, Sacramento, CA 95814', contests: [] });
    expect(mocks.getBallot).toHaveBeenCalledWith('1315 10th St, Sacramento, CA 95814');
  });

  it('keeps GET working', async () => {
    const req = new NextRequest('http://localhost/api/ballot?address=sample', {
      headers: { 'x-forwarded-for': '192.0.2.2' },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ address: 'sample', contests: [] });
    expect(mocks.getBallot).toHaveBeenCalledWith('sample');
  });

  it.each([
    ['malformed JSON', '{'],
    ['a non-string address', JSON.stringify({ address: 123 })],
    ['a short address', JSON.stringify({ address: '123' })],
  ])('returns the bad address error for %s', async (_name, body) => {
    const res = await POST(new Request('http://localhost/api/ballot', { method: 'POST', body }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Enter your street address and ZIP code.' });
    expect(mocks.getBallot).not.toHaveBeenCalled();
  });

  it('refuses a large body before reading it', async () => {
    const res = await POST(new Request('http://localhost/api/ballot', {
      method: 'POST',
      headers: { 'content-length': '100000' },
      body: JSON.stringify({ address: '1315 10th St, Sacramento, CA 95814' }),
    }));

    expect(res.status).toBe(400);
    expect(mocks.getBallot).not.toHaveBeenCalled();
  });

  it('refuses a large body that sends no content-length', async () => {
    const big = new TextEncoder().encode(JSON.stringify({ address: 'x'.repeat(100000) }));
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(big);
        controller.close();
      },
    });
    const res = await POST(new Request('http://localhost/api/ballot', { method: 'POST', body, duplex: 'half' } as RequestInit));

    expect(res.status).toBe(400);
    expect(mocks.getBallot).not.toHaveBeenCalled();
  });
});
