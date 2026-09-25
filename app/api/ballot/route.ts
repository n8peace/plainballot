import { checkBotId } from 'botid/server';
import type { NextRequest } from 'next/server';
import { BallotLookupError, getBallot } from '@/lib/ballot';
import { allow, clientIp } from '@/lib/ratelimit';

export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')?.trim() ?? '';
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
    if (e instanceof BallotLookupError) return Response.json({ error: e.message }, { status: 404 });
    console.error('ballot lookup failed', e);
    return Response.json({ error: 'Ballot lookup is down right now. Try again in a minute.' }, { status: 502 });
  }
}
