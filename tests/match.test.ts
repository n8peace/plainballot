import { describe, expect, it } from 'vitest';
import { SAMPLE_BALLOT } from '../lib/ballot/sample';
import { explain, picksFor, rank, retentionMatch, score } from '../lib/match';
import type { Contest, Prefs } from '../lib/types';

const contest = (id: string) => SAMPLE_BALLOT.contests.find((c) => c.id === id)!;

// The example voter from the mockup.
const voter: Prefs = {
  sel: ['tax', 'housing', 'safety', 'energy', 'schools'],
  pos: { tax: 1, housing: 2, safety: -1, energy: 0, schools: 1 },
  imp: { tax: 'medium', housing: 'high', safety: 'medium', energy: 'low', schools: 'high' },
};

describe('score', () => {
  it('is 100 when every chosen position matches exactly', () => {
    const c = contest('prop-a');
    expect(score(c.choices[0], c, voter).match).toBe(100);
  });

  it('leaves out issues a candidate has no position on, and reports them', () => {
    const c = contest('us-house-7');
    const kessler = c.choices.find((x) => x.name === 'Ruth Kessler')!;
    const s = score(kessler, c, voter);
    expect(s.missing).toEqual(['schools']);
    expect(s.match).toBe(94);
  });

  it('ignores issues the voter did not choose', () => {
    const c = contest('us-house-7');
    const withAbortion: Prefs = { ...voter, pos: { ...voter.pos, abortion: 2 }, imp: { ...voter.imp, abortion: 'high' } };
    expect(rank(c, withAbortion)[0].score.match).toBe(rank(c, voter)[0].score.match);
  });

  it('returns null when none of the voter’s issues are at stake', () => {
    const c = contest('supreme-court-4');
    expect(score(c.choices[0], c, voter).match).toBeNull();
  });

  it('is independent of party labels', () => {
    const c = contest('state-senate-14');
    const swapped: Contest = { ...c, choices: c.choices.map((ch) => ({ ...ch, party: 'X' })) };
    expect(rank(swapped, voter).map((r) => r.score.match)).toEqual(rank(c, voter).map((r) => r.score.match));
  });
});

describe('explain', () => {
  it('names the issue that separates the top two and whether another could flip it', () => {
    const c = contest('state-senate-14');
    const r = rank(c, voter);
    expect(r[0].choice.name).toBe('Gene Castillo');
    const ex = explain(c, voter, r);
    expect(ex.decisive).toBe('housing');
    expect(ex.counter).toBe('tax');
    expect(ex.counterFlips).toBe(true);
  });

  it('marks a close call on the school board race', () => {
    const r = rank(contest('school-board-2'), voter);
    expect(r[0].choice.name).toBe('Dev Malhotra');
    expect(r[0].score.match! - r[1].score.match!).toBeLessThan(6);
  });
});

describe('retention', () => {
  it('gives no match until the voter picks the sentencing dial', () => {
    expect(retentionMatch(contest('district-court-reyes'), voter)).toBeNull();
    const withSentencing: Prefs = { ...voter, sel: [...voter.sel, 'sentencing'], pos: { ...voter.pos, sentencing: -1 } };
    expect(retentionMatch(contest('district-court-reyes'), withSentencing)).toBe(100);
  });
});

describe('picksFor', () => {
  it('matches the example voter across the sample ballot', () => {
    expect(picksFor(SAMPLE_BALLOT.contests, voter)).toEqual([
      { office: 'U.S. House', pick: 'Ruth Kessler' },
      { office: 'State Senate', pick: 'Gene Castillo' },
      { office: 'Supreme Court', pick: null },
      { office: 'District Court', pick: null },
      { office: 'County Commissioner', pick: 'Lena Morrow' },
      { office: 'School Board', pick: 'Dev Malhotra' },
      { office: 'Proposition A', pick: 'Yes' },
      { office: 'Proposition B', pick: 'Yes' },
    ]);
  });
});
