import { createHash } from 'node:crypto';
import { NoOutputGeneratedError } from 'ai';
import { checkBotId } from 'botid/server';
import { interpret, MAX_INPUT_CHARS, type Interpretation } from '@/lib/ai/interpret';
import { aiBudgetAvailable, allow, clientIp, Memo, tooLarge } from '@/lib/ratelimit';

export const maxDuration = 20;

const cache = new Memo<Interpretation>();
const deny = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  if (tooLarge(req, 8_000)) return deny('That’s too long. Keep it under a few paragraphs.', 413);
  if ((await checkBotId()).isBot) return deny('This looks automated. Set the dials by hand instead.', 403);
  if (!allow(`interpret:${clientIp(req)}`, 12)) return deny('Too many tries in a few minutes. Wait a bit, or set the dials by hand.', 429);

  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (text.length < 10) return deny('Write at least a sentence about what matters to you.', 400);
  if (text.length > MAX_INPUT_CHARS) return deny(`Keep it under ${MAX_INPUT_CHARS} characters.`, 400);
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return deny('Reading your words isn’t connected yet. Use the dials instead.', 503);
  }

  const key = createHash('sha256').update(text.toLowerCase().replace(/\s+/g, ' ')).digest('hex');
  const hit = cache.get(key);
  if (hit) return Response.json(hit);

  if (!aiBudgetAvailable()) return deny('Lots of people are here right now. Set the dials by hand, or try again in a minute.', 503);

  try {
    const result = await interpret(text);
    cache.set(key, result);
    return Response.json(result);
  } catch (e) {
    console.error('interpret failed', NoOutputGeneratedError.isInstance(e) ? 'no output' : e);
    return deny('We couldn’t read that just now. Try again, or set the dials by hand.', 502);
  }
}
