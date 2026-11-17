// The product-market fit score: five signals, 20 points each, from counted behavior only.
// Thresholds and rules come from the shared pmf playbook. Pure math, so a test pins it.

export interface PmfInputs {
  /** Browsers that pulled a ballot last election, and how many of them pulled one again this election. */
  comeBack: { base: number; returned: number };
  /** Visitors last full week, and how many of them pulled a ballot (the north star). */
  habit: { actives: number; pulled: number };
  /** Unpaid visitors per full week, oldest first (Plain Ballot runs no ads), and visits from a shared post. */
  pull: { weekly: number[]; fromShares: number };
  /** Visitors 30 to 60 days ago, and how many took the costly step: typed an address and pulled a ballot. */
  pay: { starters: number; tookStep: number };
  /** Answers to "How would you feel if you could no longer use this?", and how many said "very disappointed". */
  love: { answers: number; veryDisappointed: number };
}

export interface Signal { name: string; points: number; note: string }

const MIN = { comeBack: 30, habit: 20, pay: 30, love: 15 };
const pct = (n: number, d: number) => (d ? (100 * n) / d : 0);
const ladder = (share: number, steps: [number, number, number, number]) =>
  share >= steps[3] ? 20 : share >= steps[2] ? 15 : share >= steps[1] ? 10 : share >= steps[0] ? 5 : 0;
const thin = (name: string) => ({ name, points: 0, note: 'not enough users to know' });

/** Weekly growth in percent: the straight-line trend across the weeks, as a share of the average week.
 *  A line, not week-to-week ratios, so one noisy week can't fake a trend. */
export function weeklyGrowth(weekly: number[]): number {
  const n = weekly.length;
  const mean = weekly.reduce((a, b) => a + b, 0) / n;
  if (n < 2 || !mean) return 0;
  const mid = (n - 1) / 2;
  const slope = weekly.reduce((a, y, i) => a + (i - mid) * (y - mean), 0) / weekly.reduce((a, _, i) => a + (i - mid) ** 2, 0);
  return (100 * slope) / mean;
}

export function scoreSignals(x: PmfInputs): Signal[] {
  const cb = x.comeBack.base < MIN.comeBack ? thin('Come back')
    : { name: 'Come back', points: ladder(pct(x.comeBack.returned, x.comeBack.base), [5, 10, 20, 30]), note: `${x.comeBack.returned} of ${x.comeBack.base}` };
  const habit = x.habit.actives < MIN.habit ? thin('Habit')
    : { name: 'Habit', points: ladder(pct(x.habit.pulled, x.habit.actives), [10, 25, 40, 60]), note: `${x.habit.pulled} of ${x.habit.actives}` };

  let pull: Signal;
  const total = x.pull.weekly.reduce((a, b) => a + b, 0);
  if (x.pull.weekly.length < 4) pull = thin('Pull');
  else {
    const g = weeklyGrowth(x.pull.weekly);
    const shared = pct(x.pull.fromShares, total);
    const points = total === 0 || g < 0 ? 0 : g >= 15 || shared >= 30 ? 20 : g >= 10 ? 15 : g >= 5 ? 10 : 5;
    pull = { name: 'Pull', points, note: `${x.pull.weekly.join(', ')} a week, ${g >= 0 ? '+' : ''}${Math.round(g)}% a week` };
  }

  const pay = x.pay.starters < MIN.pay ? thin('Pay')
    : { name: 'Pay', points: ladder(pct(x.pay.tookStep, x.pay.starters), [1, 2, 5, 10]), note: `${x.pay.tookStep} of ${x.pay.starters}` };
  const love = x.love.answers < MIN.love ? thin('Love')
    : { name: 'Love', points: ladder(pct(x.love.veryDisappointed, x.love.answers), [10, 20, 30, 40]), note: `${x.love.veryDisappointed} of ${x.love.answers}` };
  return [cb, habit, pull, pay, love];
}

const STAGES: [number, string][] = [[80, 'Fit'], [60, 'Fit forming'], [40, 'Early fit'], [20, 'Glimmer'], [0, 'Searching']];

/** Total out of 100. Come back is the gate: under 10 points there caps the total at 39. */
export function pmfScore(signals: Signal[]): { score: number; stage: string } {
  let score = signals.reduce((a, s) => a + s.points, 0);
  if ((signals.find((s) => s.name === 'Come back')?.points ?? 0) < 10) score = Math.min(score, 39);
  return { score, stage: STAGES.find(([min]) => score >= min)![1] };
}
