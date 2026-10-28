// Counts ballots pulled up, one analytics event per address lookup. The event carries only the
// state and whether this browser already pulled one this election; never the address or district.
import { track } from '@vercel/analytics';
import type { Ballot } from './types';

const KEY = 'pb-pulled';

/** What gets sent for a lookup, or null when there's nothing to count (address not found). */
export function pulledEvent(ballot: Ballot, lastCycle: string | null) {
  const state = ballot.districts?.[0]?.key.split('/')[0];
  if (!state || !/^[a-z]{2}$/.test(state)) return null;
  const cycle = ballot.electionDate.slice(0, 7);
  return { cycle, event: { state: state.toUpperCase(), first: lastCycle === cycle ? 'no' : 'yes' } };
}

export function countPull(ballot: Ballot) {
  let last: string | null = null;
  try { last = localStorage.getItem(KEY); } catch {}
  const p = pulledEvent(ballot, last);
  if (!p) return;
  try { localStorage.setItem(KEY, p.cycle); } catch {}
  track('Ballot pulled', p.event);
}
