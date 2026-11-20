import { describe, expect, it } from 'vitest';
import { isTeamBrowser, withoutNotrack } from '../lib/team';

const store = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };

describe('team browsers send no analytics', () => {
  it('counts a visitor unless the browser was marked as ours', () => {
    const s = store();
    expect(isTeamBrowser('', s)).toBe(false);
    expect(isTeamBrowser('?team=1', s)).toBe(true);
    expect(isTeamBrowser('?ref=li-1102', s)).toBe(true);
    expect(isTeamBrowser('?team=0', s)).toBe(false);
  });

  it('honors the shared ?notrack= flag under the va-disable key', () => {
    const s = store();
    expect(isTeamBrowser('?notrack=1', s)).toBe(true);
    expect(s.m.get('va-disable')).toBe('1');
    expect(isTeamBrowser('', s)).toBe(true);
    expect(isTeamBrowser('?notrack=0', s)).toBe(false);
    expect(s.m.has('va-disable')).toBe(false);
  });

  it('strips only the notrack parameter from the address', () => {
    expect(withoutNotrack('https://plainballot.com/methodology?notrack=1&ref=x#a')).toBe('/methodology?ref=x#a');
    expect(withoutNotrack('https://plainballot.com/?notrack=0')).toBe('/');
    expect(withoutNotrack('https://plainballot.com/?ref=x')).toBeNull();
  });
});
