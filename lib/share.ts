import { ISSUE_IDS, type Importance, type IssueId, type Position } from './issues';
import type { Pick } from './match';
import type { Prefs } from './types';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://plainballot.com').replace(/\/$/, '');
export const GITHUB_URL = 'https://github.com/n8peace/plainballot';
/** The open research this site reads: candidates, positions and quotes (ODbL). */
export const DATA_REPO_URL = 'https://github.com/n8peace/open-election-data';
export const X_URL = 'https://x.com/n8peace';

const IMP: Importance[] = ['low', 'medium', 'high'];

// Compact, address-free encoding of a voter's dials: "housing2h.tax1m.safety-1m"
export function encodePrefs(p: Prefs): string {
  return p.sel.map((id) => `${id}${p.pos[id] ?? 0}${(p.imp[id] ?? 'medium')[0]}`).join('.');
}

export function decodePrefs(s: string | null | undefined): Prefs | null {
  if (!s) return null;
  const out: Prefs = { sel: [], pos: {}, imp: {} };
  for (const part of s.split('.')) {
    const m = /^([a-z]+)(-?[0-2])([lmh])$/.exec(part);
    if (!m || !(ISSUE_IDS as readonly string[]).includes(m[1])) continue;
    const id = m[1] as IssueId;
    if (out.sel.includes(id)) continue;
    out.sel.push(id);
    out.pos[id] = Number(m[2]) as Position;
    out.imp[id] = IMP.find((i) => i[0] === m[3])!;
  }
  return out.sel.length ? out : null;
}

export function inviteText(): string {
  return `I just matched my whole ballot to what I actually care about. Every race, with the reasons. It's free, no account, no ads, and it doesn't tell you what to think. Try yours: ${SITE_URL}`;
}

export function picksText(picks: Pick[], electionDate: string): string {
  const date = electionDate
    ? new Date(`${electionDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Election Day';
  const lines = picks.map((p) => `• ${p.office}: ${p.pick ?? 'deciding myself'}`);
  return [`My ballot for ${date}, matched to my own priorities:`, ...lines, '', `Make yours (free, nonpartisan): ${SITE_URL}`].join('\n');
}

/** A link that carries only the voter's dials (never an address or picks). */
export function compareUrl(p: Prefs): string {
  return `${SITE_URL}/d/${encodePrefs(p)}`;
}

export function compareText(p: Prefs): string {
  return `Here's what I care about this election (${p.sel.length} issues). See where we agree, then get your own ballot, matched to you: ${compareUrl(p)}`;
}

export interface Agreement {
  shared: IssueId[];
  agree: IssueId[];
  differ: IssueId[];
  /** Issues the friend chose that you haven't set yet. */
  unset: IssueId[];
}

/** Agree = same side of the dial (or both undecided). Only issues both people chose count. */
export function agreement(mine: Prefs, theirs: Prefs): Agreement {
  const shared = theirs.sel.filter((id) => mine.sel.includes(id));
  const side = (v: number | undefined) => Math.sign(v ?? 0);
  const agree = shared.filter((id) => side(mine.pos[id]) === side(theirs.pos[id]));
  return { shared, agree, differ: shared.filter((id) => !agree.includes(id)), unset: theirs.sel.filter((id) => !mine.sel.includes(id)) };
}

/** The open "Research races in <State>" issue in Open Election Data, where people pick a race to research. */
export function stateResearchUrl(state?: string): string {
  if (!state) return `${DATA_REPO_URL}/blob/main/CONTRIBUTING.md`;
  const u = new URL(`${DATA_REPO_URL}/issues`);
  u.searchParams.set('q', `is:issue is:open "Research races in ${state}"`);
  return u.toString();
}

/** Opens the "Research a race" form on GitHub, pre-filled with what we know. */
export function researchIssueUrl(opts: { contest?: string; place?: string; candidates?: string[] }): string {
  const u = new URL(`${DATA_REPO_URL}/issues/new`);
  u.searchParams.set('template', 'research-a-race.yml');
  const contest = [opts.contest, opts.place].filter(Boolean).join(', ');
  u.searchParams.set('title', `Research: ${contest || '[Office], [District], [State]'}`);
  if (contest) u.searchParams.set('contest', contest);
  if (opts.candidates?.length) u.searchParams.set('candidates', opts.candidates.map((c) => `- ${c}`).join('\n'));
  return u.toString();
}
