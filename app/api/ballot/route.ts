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
  if ((await checkBotId()).isBot) {
    return Response.json({ error: 'This looks automated. Try again from your browser.' }, { status: 403 });
  }
  if (!allow(`ballot:${clientIp(req)}`, 30)) {
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
