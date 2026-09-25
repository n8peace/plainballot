// Researched contests come from Open Election Data, the open research repo
// (https://github.com/n8peace/open-election-data), through its free static API.
// Set ELECTION_DATA_DIR to read a local checkout's data/positions instead (offline work).

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const ELECTION_DATA_URL = (process.env.ELECTION_DATA_URL || 'https://n8peace.github.io/open-election-data/v1').replace(/\/$/, '');
const LOCAL_DIR = process.env.ELECTION_DATA_DIR;
const TTL = 10 * 60 * 1000;

export type RawContest = Record<string, unknown> & { id?: string; level?: string; division?: string };

const memo = new Map<string, { at: number; value: RawContest[] }>();
async function cached(key: string, load: () => Promise<RawContest[]>): Promise<RawContest[]> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const value = await load();
  memo.set(key, { at: Date.now(), value });
  return value;
}

async function localAll(): Promise<RawContest[]> {
  const files = (await readdir(LOCAL_DIR!).catch(() => [] as string[])).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  return Promise.all(files.map(async (f) => ({ id: f.replace(/\.json$/, ''), ...JSON.parse(await readFile(path.join(LOCAL_DIR!, f), 'utf8')) })));
}

async function getJson(url: string): Promise<unknown | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000), cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

/** The contests researched for one district, e.g. "ca/cd-10". */
export function contestsForDivision(division: string): Promise<RawContest[]> {
  if (LOCAL_DIR) return localAll().then((all) => all.filter((c) => c.division === division));
  if (!/^[a-z]{2}\/[a-z0-9-]+$/.test(division)) return Promise.resolve([]);
  return cached(division, async () => {
    const d = (await getJson(`${ELECTION_DATA_URL}/divisions/${division}.json`)) as { contests?: RawContest[] } | null;
    return d?.contests ?? [];
  });
}

/** Every researched contest (used to match an official ballot's contests to research). */
export function allContests(): Promise<RawContest[]> {
  if (LOCAL_DIR) return localAll();
  return cached('*all', async () => {
    const d = (await getJson(`${ELECTION_DATA_URL}/all.json`)) as { contests?: RawContest[] } | null;
    return d?.contests ?? [];
  });
}
