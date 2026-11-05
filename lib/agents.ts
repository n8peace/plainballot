// Counts what AI agents do through the MCP server, by day (Vercel adds the time) and by which
// app sent them. Events carry only the tool, the app and the state; never the address.
import { AsyncLocalStorage } from 'node:async_hooks';
import { track } from '@vercel/analytics/server';

/** Which AI app a request came from, read from its User-Agent. */
export function agentClient(userAgent: string | null): string {
  const ua = userAgent ?? '';
  if (/claude|anthropic/i.test(ua)) return 'claude';
  if (/openai|chatgpt/i.test(ua)) return 'chatgpt';
  if (/gemini|google/i.test(ua)) return 'gemini';
  if (/cursor/i.test(ua)) return 'cursor';
  if (/grok|xai/i.test(ua)) return 'grok';
  return 'other';
}

// One MCP request at a time per async context, so concurrent requests on a reused instance
// each count under their own app.
const current = new AsyncLocalStorage<{ client: string; headers: Headers }>();

export function withAgent<T>(req: Request, fn: () => T): T {
  return current.run({ client: agentClient(req.headers.get('user-agent')), headers: req.headers }, fn);
}

export async function countAgent(event: 'Agent tool call' | 'Agent ballot pulled', props: Record<string, string>) {
  const ctx = current.getStore();
  try {
    await track(event, { ...props, client: ctx?.client ?? 'other' }, { headers: ctx?.headers });
  } catch { /* counting never breaks a lookup */ }
}
