import { checkBotId } from 'botid/server';
import type { NextRequest } from 'next/server';
import { BallotLookupError, getBallot } from '@/lib/ballot';
import { allow, clientIp } from '@/lib/ratelimit';

export const maxDuration = 15;

async function lookup(req: Request, address: string) {
  if (address.length < 5 || address.length > 200) {
    return Response.json({ error: 'Enter your street address and ZIP code.' }, { status: 400 });
  }
  // Ballot lookup uses free services and is the core of the site, so a suspected
  // bot is slowed down, never blocked outright: a false positive must not stop a voter.
  const suspected = (await checkBotId()).isBot;
  if (!allow(`ballot:${suspected ? 'bot:' : ''}${clientIp(req)}`, suspected ? 5 : 30)) {
    return Response.json({ error: 'Too many lookups in a few minutes. Wait a bit and try again.' }, { status: 429 });
  }
  try {
    return Response.json(await getBallot(address), { headers: { 'cache-control': 'private, no-store' } });
  } catch (e) {
    if (e instanceof BallotLookupError) return Response.json({ error: e.message }, { status: e.retryable ? 503 : 404 });
    console.error('ballot lookup failed', e);
    return Response.json({ error: 'Ballot lookup is down right now. Try again in a minute.' }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  return lookup(req, req.nextUrl.searchParams.get('address')?.trim() ?? '');
}

const MAX_BODY = 2048;

// Reads at most MAX_BODY bytes of the request; null when the body is larger.
async function readSmallBody(req: Request): Promise<string | null> {
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) return null;
  const reader = req.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function POST(req: Request) {
  let address = '';
  try {
    const text = await readSmallBody(req);
    const body: unknown = text ? JSON.parse(text) : null;
    if (typeof body === 'object' && body !== null && 'address' in body && typeof body.address === 'string') {
      address = body.address.trim();
    }
  } catch {
    address = '';
  }
  return lookup(req, address);
}
