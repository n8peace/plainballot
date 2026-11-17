// Our own visits (Nate, test runs, agents checking a deploy) must never count as voters.
// Opening any page with ?team=1 marks this browser as ours; ?team=0 clears it.
const KEY = 'pb-team';

/** Reads a ?team= flag from the query string, stores it, and says whether this browser is ours. */
export function isTeamBrowser(search: string, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): boolean {
  const flag = new URLSearchParams(search).get('team');
  if (flag === '1') storage.setItem(KEY, '1');
  if (flag === '0') storage.removeItem(KEY);
  return storage.getItem(KEY) === '1';
}
