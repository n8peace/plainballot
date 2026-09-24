// Matching is plain arithmetic, run in the voter's browser. No model is involved,
// so the same answers always produce the same ballot.
//
// For each issue the voter chose that a contest decides, distance is how far the
// voter's dial sits from the choice's position (0–4), weighted by importance.
// Match % = 100 − weighted average distance scaled to 0–100.
// An issue where a choice has no sourced position is left out, never guessed.

import { WEIGHT, type IssueId } from './issues';
import type { Choice, Contest, Prefs } from './types';

export type WeightFn = (id: IssueId) => number;

export const weightFor = (prefs: Prefs): WeightFn => (id) =>
  prefs.sel.includes(id) ? WEIGHT[prefs.imp[id] ?? 'medium'] : 0;

const userPos = (prefs: Prefs, id: IssueId) => prefs.pos[id] ?? 0;

export interface Score {
  match: number | null;
  missing: IssueId[];
}

export function score(choice: Choice, contest: Contest, prefs: Prefs, w: WeightFn = weightFor(prefs)): Score {
  let sum = 0;
  let tot = 0;
  const missing: IssueId[] = [];
  for (const id of contest.issues) {
    const k = w(id);
    if (!k) continue;
    const s = choice.stances[id];
    if (!s) {
      missing.push(id);
      continue;
    }
    sum += k * Math.abs(userPos(prefs, id) - s.pos);
    tot += k;
  }
  return { match: tot ? Math.round(100 - (sum / (tot * 4)) * 100) : null, missing };
}

export interface Ranked {
  choice: Choice;
  score: Score;
}

export function rank(contest: Contest, prefs: Prefs): Ranked[] {
  return contest.choices
    .map((choice) => ({ choice, score: score(choice, contest, prefs) }))
    .sort((a, b) => (b.score.match ?? -1) - (a.score.match ?? -1));
}

export interface Explanation {
  /** Issue that most separates the top choice from the runner-up. */
  decisive: IssueId | null;
  /** Issue where the runner-up is closest to the voter, if any. */
  counter: IssueId | null;
  /** Whether making `counter` the voter's top priority would flip the result. */
  counterFlips: boolean;
  /** Issues the voter chose that this contest decides. */
  used: IssueId[];
}

export function explain(contest: Contest, prefs: Prefs, ranked: Ranked[]): Explanation {
  const [win, run] = ranked;
  const w = weightFor(prefs);
  const used = contest.issues.filter((id) => w(id) > 0);
  const both = used.filter((id) => win.choice.stances[id] && run.choice.stances[id]);
  const d = (c: Choice, id: IssueId) => Math.abs(userPos(prefs, id) - c.stances[id]!.pos);

  let decisive: IssueId | null = null;
  let counter: IssueId | null = null;
  let best = 0;
  let worst = 0;
  for (const id of both) {
    const gap = w(id) * (d(run.choice, id) - d(win.choice, id));
    if (gap > best) { best = gap; decisive = id; }
    if (-gap > worst) { worst = -gap; counter = id; }
  }

  let counterFlips = false;
  if (counter) {
    const flip: WeightFn = (id) => (!prefs.sel.includes(id) ? 0 : id === counter ? 3 : 1);
    const a = score(win.choice, contest, prefs, flip).match ?? 0;
    const b = score(run.choice, contest, prefs, flip).match ?? 0;
    counterFlips = b >= a;
  }
  return { decisive, counter, counterFlips, used };
}

/** Retention: match the judge's record on its one measurable issue. */
export function retentionMatch(contest: Contest, prefs: Prefs): number | null {
  const r = contest.record;
  if (!r || !prefs.sel.includes(r.issue)) return null;
  return Math.round(100 - Math.abs(userPos(prefs, r.issue) - r.stance.pos) * 25);
}

export const CLOSE_CALL = 6;
export const RETAIN_THRESHOLD = 60;

export interface Pick {
  office: string;
  pick: string | null; // null = no match, voter decides
}

export function picksFor(contests: Contest[], prefs: Prefs): Pick[] {
  return contests.map((c) => {
    if (c.kind === 'retention') {
      const m = retentionMatch(c, prefs);
      return { office: c.office, pick: m === null ? null : m >= RETAIN_THRESHOLD ? 'Retain' : 'Remove' };
    }
    if (!c.researched) return { office: c.office, pick: null };
    const r = rank(c, prefs);
    return { office: c.office, pick: r[0]?.score.match == null ? null : r[0].choice.name };
  });
}
