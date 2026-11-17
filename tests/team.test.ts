import { describe, expect, it } from 'vitest';
import { isTeamBrowser } from '../lib/team';

const store = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };

describe('team browsers send no analytics', () => {
  it('counts a visitor unless the browser was marked as ours', () => {
    const s = store();
    expect(isTeamBrowser('', s)).toBe(false);
    expect(isTeamBrowser('?team=1', s)).toBe(true);
    expect(isTeamBrowser('?ref=li-1102', s)).toBe(true);
    expect(isTeamBrowser('?team=0', s)).toBe(false);
  });
});
