// Neutrality guarantees for matching, checked on every change. If one fails, the change
// treats one side, party or candidate differently from another. Dial wording and
// research agreement are tested in the research repo (open-election-data).

import { describe, expect, it } from 'vitest';
import { SAMPLE_BALLOT } from '../lib/ballot/sample';
import { ISSUES, type Position } from '../lib/issues';
import { rank, score } from '../lib/match';
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

// The sample ballot here; the research repo's own tests cover its data and agreement rules.
async function allContests(): Promise<Contest[]> {
  return SAMPLE_BALLOT.contests.filter((c) => c.choices.length);
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
