import { describe, expect, it } from 'vitest';
import { pmfScore, scoreSignals, weeklyGrowth, type PmfInputs } from '../lib/pmf';

const today: PmfInputs = {
  comeBack: { base: 4, returned: 0 },
  habit: { actives: 16, pulled: 1 },
  pull: { weekly: [13, 17, 11, 16], fromShares: 3 },
  pay: { starters: 9, tookStep: 0 },
  love: { answers: 0, veryDisappointed: 0 },
};

describe('pmf score', () => {
  it('scores thin signals as 0 and says so', () => {
    const s = scoreSignals(today);
    expect(s.map((x) => x.points)).toEqual([0, 0, 5, 0, 0]);
    expect(s[0].note).toBe('not enough users to know');
    expect(pmfScore(s)).toEqual({ score: 5, stage: 'Searching' });
  });

  it('caps the total at 39 when people do not come back', () => {
    const strong: PmfInputs = {
      comeBack: { base: 100, returned: 4 },
      habit: { actives: 100, pulled: 70 },
      pull: { weekly: [100, 120, 140, 170], fromShares: 0 },
      pay: { starters: 100, tookStep: 20 },
      love: { answers: 50, veryDisappointed: 25 },
    };
    expect(pmfScore(scoreSignals(strong))).toEqual({ score: 39, stage: 'Glimmer' });
    expect(pmfScore(scoreSignals({ ...strong, comeBack: { base: 100, returned: 35 } }))).toEqual({ score: 100, stage: 'Fit' });
  });

  it('reads the Pull ladder from weekly growth and shares', () => {
    expect(weeklyGrowth([100, 110, 121])).toBeCloseTo(9.5, 1);
    expect(weeklyGrowth([13, 17, 11, 16])).toBeCloseTo(2.1, 1);
    const pull = (weekly: number[], fromShares = 0) => scoreSignals({ ...today, pull: { weekly, fromShares } })[2].points;
    expect(pull([10, 9, 8, 7])).toBe(0);
    expect(pull([0, 0, 0, 0])).toBe(0);
    expect(pull([100, 106, 112, 119])).toBe(10);
    expect(pull([100, 100, 100, 100], 120)).toBe(20);
  });
});
