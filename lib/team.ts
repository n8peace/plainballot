// Our own visits (Nate, test runs, agents checking a deploy) must never count as voters.
// Opening any page with ?team=1 marks this browser as ours; ?team=0 clears it.
// ?notrack=1 / ?notrack=0 do the same with the 'va-disable' key, shared by all of Nate's sites.
const KEY = 'pb-team';
const NOTRACK_KEY = 'va-disable';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function apply(flag: string | null, key: string, storage: Store) {
  if (flag === '1') storage.setItem(key, '1');
  if (flag === '0') storage.removeItem(key);
}

/** Reads ?team= and ?notrack= flags from the query string, stores them, and says whether this browser is ours. */
export function isTeamBrowser(search: string, storage: Store): boolean {
  const q = new URLSearchParams(search);
  apply(q.get('team'), KEY, storage);
  apply(q.get('notrack'), NOTRACK_KEY, storage);
  return storage.getItem(KEY) === '1' || storage.getItem(NOTRACK_KEY) === '1';
}

/** The same address without ?notrack=, or null when it has none. */
export function withoutNotrack(href: string): string | null {
  const u = new URL(href);
  if (!u.searchParams.has('notrack')) return null;
  u.searchParams.delete('notrack');
  return u.pathname + u.search + u.hash;
}
