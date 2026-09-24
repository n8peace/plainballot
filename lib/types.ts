import type { Importance, IssueId, Position } from './issues';

/** One sourced claim about where a candidate or measure stands on one issue. */
export interface Stance {
  pos: Position;
  /** One neutral sentence a voter can read. */
  text: string;
  sourceUrl?: string;
}

export interface Choice {
  id: string;
  name: string;
  party?: string;
  url?: string;
  stances: Partial<Record<IssueId, Stance>>;
}

export interface Fact {
  value: string;
  label: string;
}

export type ContestKind = 'candidate' | 'measure' | 'retention';

export interface Contest {
  id: string;
  kind: ContestKind;
  office: string;
  sub: string;
  summary?: string;
  /** Issues this office or measure actually decides. */
  issues: IssueId[];
  choices: Choice[];
  /** False when we have the contest but haven't researched positions yet. */
  researched: boolean;
  sources?: string;
  /** Retention only: the judge's record on the one issue we can measure, plus facts to weigh. */
  record?: { issue: IssueId; stance: Stance; facts: Fact[] };
}

export interface Ballot {
  electionName: string;
  /** The voter's districts, when their address was found. */
  districts?: { key: string; label: string }[];
  /** True when the address was found but none of its races are researched yet. */
  needsResearch?: boolean;
  electionDate: string; // YYYY-MM-DD
  place: string;
  sample: boolean;
  notice?: string;
  contests: Contest[];
}

export interface Prefs {
  sel: IssueId[];
  pos: Partial<Record<IssueId, Position>>;
  imp: Partial<Record<IssueId, Importance>>;
}
