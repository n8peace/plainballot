// In-app abuse limits. These are the last line of defense: Vercel's platform DDoS
// mitigation, BotID and the WAF rate-limit rules (docs/security.md) stop most
// abuse before it gets here. Counts are per server instance.

const WINDOW_MS = 10 * 60 * 1000;
const buckets = new Map<string, number[]>();

/** Sliding-window limit: at most `limit` hits per key per 10 minutes. */
export function allow(key: string, limit: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  const ok = recent.length < limit;
  if (ok) recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 20_000) buckets.clear();
  return ok;
}

/**
 * Spend circuit breaker: caps paid AI calls per instance per minute, so a flood
 * that slips past every other layer can't run up an unbounded bill.
 */
let minute = 0;
let calls = 0;
export function aiBudgetAvailable(perMinute = Number(process.env.AI_CALLS_PER_MINUTE ?? 120)): boolean {
  const m = Math.floor(Date.now() / 60_000);
  if (m !== minute) { minute = m; calls = 0; }
  if (calls >= perMinute) return false;
  calls++;
  return true;
}

/** Small LRU so repeated identical requests (retries, scripted floods) don't cost twice. */
export class Memo<T> {
  private map = new Map<string, T>();
  constructor(private max = 500) {}
  get(k: string): T | undefined {
    const v = this.map.get(k);
    if (v !== undefined) { this.map.delete(k); this.map.set(k, v); }
    return v;
  }
  set(k: string, v: T) {
    this.map.set(k, v);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

/** Rejects oversized bodies before reading them. */
export function tooLarge(req: Request, maxBytes: number): boolean {
  const len = Number(req.headers.get('content-length') ?? 0);
  return len > maxBytes;
}
