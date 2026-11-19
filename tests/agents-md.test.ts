import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GET } from '../app/agents.md/route';
import { AGENTS_MD, AGENTS_URL } from '../lib/agents-md';
import { SETUP_MD, SETUP_URL } from '../lib/setup';

describe('agents page', () => {
  it('is served as markdown at /agents.md', async () => {
    const res = GET();
    expect(res.headers.get('content-type')).toMatch(/^text\/markdown/);
    expect(await res.text()).toBe(AGENTS_MD);
    expect(AGENTS_URL).toBe('https://plainballot.com/agents.md');
  });

  it('keeps the shared sections in order', () => {
    const heads = [...AGENTS_MD.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(heads).toEqual(['Say it', 'Listen', 'Do', 'Never', 'Fresh']);
  });

  it('marks every action go, say back or screen', () => {
    const rows = AGENTS_MD.split('## Do')[1].split('## Never')[0].split('\n').filter((l) => l.startsWith('| ') && !/^\| (Action|---)/.test(l));
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.split('|').at(-2)!.trim(), r).toMatch(/^(go|say back|screen)\b/);
  });

  it('never puts an address in a web address, and keeps the hard lines', () => {
    expect(AGENTS_MD).not.toMatch(/\?address=/);
    for (const line of ['Never recommend a choice', 'Never shorten or reword', 'Never guess a district', 'read it back', 'Never say or imply the election is still ahead']) expect(AGENTS_MD).toContain(line);
  });

  it('agrees with the setup guide on asking first', () => {
    expect(AGENTS_MD).toContain(SETUP_URL);
    expect(SETUP_MD).toMatch(/wait for a yes/);
  });

  it('is listed for AI readers', () => {
    expect(readFileSync('public/llms.txt', 'utf8')).toContain(AGENTS_URL);
  });
});
