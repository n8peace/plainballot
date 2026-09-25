import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { ISSUE_IDS, NEITHER, issueById, toPosition, type IssueId, type Position } from '../issues';
import type { Contest } from '../types';

// Researched positions live as reviewable JSON files in data/positions/, written by
// `npm run research`. They publish once independent agents agree and every quote
// verifies; `reviewed: true` marks files a person has also checked (shown to voters).

// In the files, a stance names its side in words (the dial's short label), so a
// person writing or reviewing research can't put someone on the wrong end by
// flipping a sign. It's converted to a number when loaded.
const StanceSchema = z.object({
  toward: z.string(),
  strength: z.enum(['lean', 'strong']),
  text: z.string().min(10).max(240),
  quote: z.string().min(12),
  sourceUrl: z.url(),
  /** How many independent research agents agreed, e.g. "3/3" or "7/10". */
  agreement: z.string().regex(/^\d+\/\d+$/).optional(),
});

const StancesSchema = z.partialRecord(z.enum(ISSUE_IDS), StanceSchema).transform((rec, ctx) => {
  const out: Partial<Record<IssueId, { pos: Position; text: string; quote: string; sourceUrl: string; agreement?: string }>> = {};
  for (const [id, s] of Object.entries(rec) as [IssueId, z.infer<typeof StanceSchema>][]) {
    if (!s) continue;
    const pos = toPosition(id, s.toward, s.strength);
    if (pos === null) {
      const i = issueById[id];
      ctx.addIssue({ code: 'custom', path: [id, 'toward'], message: `"${s.toward}" isn't a side of ${i.name}. Use "${i.l}", "${i.r}" or "${NEITHER}".` });
      continue;
    }
    out[id] = { pos, text: s.text, quote: s.quote, sourceUrl: s.sourceUrl, agreement: s.agreement };
  }
  return out;
});

export const PositionsFileSchema = z.object({
  office: z.string(),
  district: z.string().optional(),
  /** Which voters see this contest, e.g. "ca/cd-10" or "ca/county-contra-costa". See lib/address/census.ts. */
  division: z.string().regex(/^[a-z]{2}\/[a-z0-9-]+$/, 'Use a division key like "ca/cd-10" or "ca/county-contra-costa"').optional(),
  kind: z.enum(['candidate', 'measure', 'retention']).default('candidate'),
  /** Measures: a plain one-sentence description of what it does. */
  summary: z.string().max(400).optional(),
  issues: z.array(z.enum(ISSUE_IDS)),
  choices: z.array(
    z.object({
      name: z.string(),
      party: z.string().optional(),
      stances: StancesSchema,
    }),
  ),
  sources: z.string().optional(),
  checkedAt: z.string(),
  reviewed: z.boolean(),
});

export type PositionsFile = z.output<typeof PositionsFileSchema>;
/** The on-disk shape (sides named in words). */
export type PositionsFileInput = z.input<typeof PositionsFileSchema>;

export const POSITIONS_DIR = path.join(process.cwd(), 'data', 'positions');

export const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const contestKey = (office: string, district?: string) => slug([office, district].filter(Boolean).join(' '));
export const nameKey = (name: string) => slug(name).split('-').filter((p) => p.length > 1).sort().join('-');

let cache: Map<string, PositionsFile> | null = null;

/** Loads all research files keyed by contest. */
export async function loadPositions(): Promise<Map<string, PositionsFile>> {
  if (cache) return cache;
  const out = new Map<string, PositionsFile>();
  let files: string[] = [];
  try {
    files = (await readdir(POSITIONS_DIR)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  } catch {
    // No research yet.
  }
  for (const f of files) {
    const parsed = PositionsFileSchema.safeParse(JSON.parse(await readFile(path.join(POSITIONS_DIR, f), 'utf8')));
    if (!parsed.success) {
      console.warn(`Skipping ${f}: ${parsed.error.message}`);
      continue;
    }
    out.set(contestKey(parsed.data.office, parsed.data.district), parsed.data);
  }
  cache = out;
  return out;
}

// Within the same district, the order offices appear on a California ballot.
// Checked in this order so "Lieutenant Governor" doesn't match "Governor".
const OFFICE_ORDER: [RegExp, number][] = [
  [/lieutenant governor/i, 1], [/governor/i, 0], [/secretary of state/i, 2], [/controller/i, 3], [/treasurer/i, 4],
  [/attorney general/i, 5], [/insurance commissioner/i, 6], [/board of equalization/i, 7],
];
export function officeRank(f: PositionsFile): number {
  if (f.kind === 'measure') return Number(/\d+/.exec(f.office)?.[0]) || 0;
  return OFFICE_ORDER.find(([re]) => re.test(f.office))?.[1] ?? 500;
}

/** Researched contests for a voter's districts, used before official candidate lists are published. */
export async function contestsForDivisions(keys: string[]): Promise<Contest[]> {
  const files = [...(await loadPositions()).values()].filter((f) => f.division && keys.includes(f.division));
  // Same order as the voter's districts: statewide, U.S. House, legislature, county, city, schools.
  // Printed-ballot order: partisan statewide offices, then U.S. Senate, House and
  // legislature (by district), then nonpartisan offices, then judges, then measures.
  const group = (f: PositionsFile) =>
    f.kind === 'measure' ? 4
      : f.kind === 'retention' ? 3
        : /superintendent/i.test(f.office) ? 2
          : f.division!.endsWith('/state') && !/u\.?\s?s\.?\s*senat|united states senat/i.test(f.office) ? 0 : 1;
  const sortKey = new Map(files.map((f) => [f, [group(f), keys.indexOf(f.division!), officeRank(f)]]));
  // Compare field by field, so no key can overflow into another.
  files.sort((a, b) => {
    const [x, y] = [sortKey.get(a)!, sortKey.get(b)!];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
  return files.map((f) => fileToContest(f));
}

export function fileToContest(f: PositionsFile): Contest {
  const measure = f.kind === 'measure';
  return {
    id: contestKey(f.office, f.district),
    kind: measure ? 'measure' : 'candidate',
    office: f.office,
    sub: [f.district, measure ? 'Yes or No' : 'Vote for one'].filter(Boolean).join(' · '),
    summary: f.summary,
    issues: f.issues,
    researched: true,
    reviewedByPerson: f.reviewed,
    sources: f.sources,
    choices: f.choices.map((ch) => ({
      id: slug(ch.name),
      name: ch.name,
      party: ch.party,
      stances: Object.fromEntries(
        Object.entries(ch.stances).filter(([, s]) => s).map(([id, s]) => [id, { pos: s!.pos, text: s!.text, sourceUrl: s!.sourceUrl, agreement: s!.agreement }]),
      ),
    })),
  };
}
