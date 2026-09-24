import { ISSUE_IDS, type Importance, type IssueId, type Position } from './issues';
import type { Pick } from './match';
import type { Prefs } from './types';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://plainballot.com').replace(/\/$/, '');
export const GITHUB_URL = 'https://github.com/n8peace/plainballot';
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
