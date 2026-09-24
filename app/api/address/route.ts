import type { NextRequest } from 'next/server';
import { suggestAddresses } from '@/lib/address/suggest';
import { allow, clientIp } from '@/lib/ratelimit';

export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 4 || q.length > 120) return Response.json({ suggestions: [] });
  if (!allow(`address:${clientIp(req)}`, 120)) return Response.json({ suggestions: [] }, { status: 429 });
  try {
    return Response.json({ suggestions: await suggestAddresses(q) }, { headers: { 'cache-control': 'private, max-age=300' } });
  } catch {
    return Response.json({ suggestions: [] });
  }
}
