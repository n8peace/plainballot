// Counts visits that came from a tagged link in a post (plainballot.com/?ref=li-1102), so we
// can see which posts bring people in. The event carries only the tag, never anything else.
import { track } from '@vercel/analytics';

/** The tag from a page's query string, or null when there's none or it isn't one of ours. */
export function refTag(search: string): string | null {
  const ref = new URLSearchParams(search).get('ref')?.toLowerCase() ?? '';
  return /^[a-z0-9-]{1,24}$/.test(ref) ? ref : null;
}

export function countRef() {
  const ref = refTag(location.search);
  if (!ref) return;
  // This runs on page load, before the analytics script may have set up its queue, and
  // track() drops events until then. Set up the same queue it uses so the event waits.
  const w = window as unknown as { va?: (...params: unknown[]) => void; vaq?: unknown[][] };
  w.va ??= (...params) => { (w.vaq ??= []).push(params); };
  track('Visit from post', { ref });
}
