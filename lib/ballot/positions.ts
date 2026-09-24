import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { ISSUE_IDS } from '../issues';

// Researched positions live as reviewable JSON files in data/positions/, written by
// `npm run research` and checked by a person before `reviewed` is set to true.

const StanceSchema = z.object({
  pos: z.union([z.literal(-2), z.literal(-1), z.literal(0), z.literal(1), z.literal(2)]),
  text: z.string(),
  quote: z.string(),
  sourceUrl: z.url(),
});

export const PositionsFileSchema = z.object({
  office: z.string(),
  district: z.string().optional(),
  kind: z.enum(['candidate', 'measure', 'retention']).default('candidate'),
  issues: z.array(z.enum(ISSUE_IDS)),
  choices: z.array(
    z.object({
      name: z.string(),
      party: z.string().optional(),
      stances: z.partialRecord(z.enum(ISSUE_IDS), StanceSchema),
    }),
  ),
  sources: z.string().optional(),
  checkedAt: z.string(),
  reviewed: z.boolean(),
});

export type PositionsFile = z.infer<typeof PositionsFileSchema>;

export const POSITIONS_DIR = path.join(process.cwd(), 'data', 'positions');

export const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const contestKey = (office: string, district?: string) => slug([office, district].filter(Boolean).join(' '));
export const nameKey = (name: string) => slug(name).split('-').filter((p) => p.length > 1).sort().join('-');

let cache: Map<string, PositionsFile> | null = null;

/** Loads reviewed positions keyed by contest. Unreviewed files load only when SHOW_UNREVIEWED=1. */
export async function loadPositions(): Promise<Map<string, PositionsFile>> {
  if (cache) return cache;
  const out = new Map<string, PositionsFile>();
  const showUnreviewed = process.env.SHOW_UNREVIEWED === '1';
  let files: string[] = [];
  try {
    files = (await readdir(POSITIONS_DIR)).filter((f) => f.endsWith('.json'));
  } catch {
    // No research yet.
  }
  for (const f of files) {
    const parsed = PositionsFileSchema.safeParse(JSON.parse(await readFile(path.join(POSITIONS_DIR, f), 'utf8')));
    if (!parsed.success) {
      console.warn(`Skipping ${f}: ${parsed.error.message}`);
      continue;
    }
    if (parsed.data.reviewed || showUnreviewed) out.set(contestKey(parsed.data.office, parsed.data.district), parsed.data);
  }
  cache = out;
  return out;
}
