// Read-only counts from Vercel Web Analytics, through the signed-in Vercel CLI.
// Shared by the PMF score (scripts/pmf.ts) and the daily number (scripts/daily-number.ts).
import { execFileSync } from 'node:child_process';

const PROJECT = 'prj_PyT57qWFSdbFBtAk1HfxcHQur381';
const TEAM = 'n8peaces-projects';

export type Row = { visitors: number; count?: number; timestamp?: string };
export function query(kind: 'visits' | 'events', op: 'aggregate' | 'count', params: Record<string, string>): { data: Row[] | Row } {
  const qs = new URLSearchParams({ projectId: PROJECT, slug: TEAM, ...params });
  const out = execFileSync('vercel', ['api', `/v1/query/web-analytics/${kind}/${op}?${qs}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return JSON.parse(out.slice(out.indexOf('{')));
}
export const rows = (r: { data: Row[] | Row }) => (Array.isArray(r.data) ? r.data : [r.data]);
export const sum = (r: Row[], key: 'visitors' | 'count') => r.reduce((a, x) => a + (x[key] ?? 0), 0);
export const event = (name: string, extra = '') => `eventName eq '${name}'${extra}`;
/** A query window; `until` is exclusive, so the last millisecond before it is the inclusive end. */
export const span = (since: Date | string, until: Date | string) => ({ since: typeof since === 'string' ? since : since.toISOString(), until: typeof until === 'string' ? until : new Date(until.getTime() - 1).toISOString() });
