// Neutrality guarantees, checked on every change. If one of these fails, the change
// treats one side, party or candidate differently from another.

import { describe, expect, it } from 'vitest';
import { fileToContest, loadPositions } from '../lib/ballot/positions';
import { SAMPLE_BALLOT } from '../lib/ballot/sample';
import { ISSUES, NEITHER, toPosition, type IssueId, type Position } from '../lib/issues';
import { rank, score } from '../lib/match';
import { decide, type AgentResult } from '../lib/research/consensus';
import type { Contest, Prefs } from '../lib/types';

const voter: Prefs = {
  sel: ISSUES.map((i) => i.id),
  pos: Object.fromEntries(ISSUES.map((i, n) => [i.id, ((n % 5) - 2) as Position])),
  imp: Object.fromEntries(ISSUES.map((i, n) => [i.id, (['low', 'medium', 'high'] as const)[n % 3]])),
};

const mirrorPrefs = (p: Prefs): Prefs => ({ ...p, pos: Object.fromEntries(Object.entries(p.pos).map(([k, v]) => [k, -v!])) });
const mirrorContest = (c: Contest): Contest => ({
  ...c,
  choices: c.choices.map((ch) => ({
    ...ch,
    stances: Object.fromEntries(Object.entries(ch.stances).map(([k, s]) => [k, { ...s!, pos: -s!.pos }])),
  })),
});

async function allContests(): Promise<Contest[]> {
  const real = [...(await loadPositions()).values()].map(fileToContest);
  return [...SAMPLE_BALLOT.contests, ...real].filter((c) => c.choices.length);
}

describe('matching treats both ends of every dial the same', () => {
  it('flipping every dial and every position gives identical scores', async () => {
    for (const c of await allContests()) {
      const a = c.choices.map((ch) => score(ch, c, voter).match);
      const m = mirrorContest(c);
      const b = m.choices.map((ch) => score(ch, m, mirrorPrefs(voter)).match);
      expect(b, c.office).toEqual(a);
    }
  });

  it('ignores names, parties and the order candidates are listed in', async () => {
    for (const c of await allContests()) {
      const byName = new Map(rank(c, voter).map((r) => [r.choice.name, r.score.match]));
      const anon: Contest = { ...c, choices: [...c.choices].reverse().map((ch) => ({ ...ch, party: undefined })) };
      for (const ch of anon.choices) expect(score(ch, anon, voter).match, `${c.office}: ${ch.name}`).toBe(byName.get(ch.name));
    }
  });
});

describe('dial wording is balanced', () => {
  const LOADED = /\b(radical|extreme|extremist|common[- ]sense|woke|illegal alien|baby[- ]kill|gun[- ]grab|socialis[mt]|fascis[mt]|job[- ]kill|anti-?(science|family|american))/i;

  it.each(ISSUES.map((i) => [i.name, i] as const))('%s: two distinct, similar-length, unloaded ends', (_, i) => {
    expect(i.l).not.toBe(i.r);
    expect(i.left).not.toBe(i.right);
    const ratio = Math.max(i.left.length, i.right.length) / Math.min(i.left.length, i.right.length);
    expect(ratio).toBeLessThan(2.2);
    for (const text of [i.left, i.right, i.l, i.r, i.name]) expect(text).not.toMatch(LOADED);
  });

  it('reads both ends back as equal and opposite', () => {
    for (const i of ISSUES) {
      for (const s of ['lean', 'strong'] as const) expect(toPosition(i.id, i.l, s)).toBe(-toPosition(i.id, i.r, s)!);
      expect(toPosition(i.id, NEITHER, 'strong')).toBe(0);
    }
  });
});

describe('research agreement treats both sides the same', () => {
  const stance = (pos: Position) => ({ pos, text: 'Said something about it.', quote: 'a quote from the source', sourceUrl: 'https://example.org' });
  const runsOf = (id: IssueId, positions: (Position | null)[]): AgentResult[] => positions.map((p) => (p === null ? {} : { [id]: stance(p) }));
  const cases: (Position | null)[][] = [[2, 2, 1], [1, 1, null], [1, -1, 1], [2, 2, 2, 2, -1, null, null, 1, 1, 0], [1, 1, 1, -1, -1, -1, 0, null, null, null]];

  it.each(cases)('mirrored agent findings give the mirrored decision: %j', (...positions) => {
    for (const i of ISSUES) {
      const a = decide(i.id, runsOf(i.id, positions));
      const b = decide(i.id, runsOf(i.id, positions.map((p) => (p === null ? null : ((-p || 0) as Position)))));
      expect(b === null).toBe(a === null);
      if (a && b) {
        expect(b.agreement).toBe(a.agreement);
        expect(b.stance?.pos ?? 0).toBe(-(a.stance?.pos ?? 0) || 0);
      }
    }
  });
});
