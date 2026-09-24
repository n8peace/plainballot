import { describe, expect, it } from 'vitest';
import { cleanInterpretation } from '../lib/ai/interpret';
import { htmlToText, quoteIsInSource } from '../lib/ai/research';
import { issuesForOffice } from '../lib/ballot/offices';
import { nameKey } from '../lib/ballot/positions';
import { decodePrefs, encodePrefs, picksText } from '../lib/share';

describe('research quote check', () => {
  const sources = [{ url: 'https://a.test', text: htmlToText('<p>I voted for the  “Housing Now” act in 2025.</p><script>x()</script>') }];

  it('accepts a quote that appears in the source, ignoring spacing and curly quotes', () => {
    expect(quoteIsInSource('voted for the "Housing Now" act', 'https://a.test', sources)).toBe(true);
  });
  it('rejects a quote that is not in the source', () => {
    expect(quoteIsInSource('voted against the Housing Now act', 'https://a.test', sources)).toBe(false);
  });
  it('rejects a quote attributed to the wrong source', () => {
    expect(quoteIsInSource('voted for the "Housing Now" act', 'https://b.test', sources)).toBe(false);
  });
  it('rejects quotes too short to prove anything', () => {
    expect(quoteIsInSource('voted', 'https://a.test', sources)).toBe(false);
  });
});

describe('reading the voter’s words', () => {
  const text = "We need way more housing. Energy isn't a big one for me.";
  it('keeps real quotes, blanks invented ones, and dedupes issues', () => {
    const out = cleanInterpretation(
      {
        dials: [
          { issue: 'housing', toward: 'building more housing', strength: 'strong', importance: 'high', quote: 'we need way more housing' },
          { issue: 'housing', toward: 'slower growth', strength: 'strong', importance: 'low', quote: '' },
          { issue: 'energy', toward: 'neither side', strength: 'lean', importance: 'low', quote: 'I love coal' },
          { issue: 'guns', toward: 'ban everything', strength: 'strong', importance: 'high', quote: '' },
        ],
        unmatched: [],
      },
      text,
    );
    expect(out.dials).toHaveLength(2);
    expect(out.dials[0]).toMatchObject({ issue: 'housing', position: 2, quote: 'we need way more housing' });
    expect(out.dials[1].quote).toBe('');
  });
});

describe('sides, not signs', () => {
  it('converts a named side to the right end of the dial', async () => {
    const { toPosition } = await import('../lib/issues');
    expect(toPosition('schools', 'district public schools', 'strong')).toBe(2);
    expect(toPosition('schools', 'School choice', 'lean')).toBe(-1);
    expect(toPosition('schools', 'neither side', 'strong')).toBe(0);
    expect(toPosition('schools', 'vouchers are bad', 'strong')).toBeNull();
  });
});

describe('sharing', () => {
  it('round-trips dial settings without any address', () => {
    const p = { sel: ['housing', 'safety'] as const, pos: { housing: 2, safety: -1 } as const, imp: { housing: 'high', safety: 'medium' } as const };
    const s = encodePrefs({ sel: [...p.sel], pos: { ...p.pos }, imp: { ...p.imp } });
    expect(s).toBe('housing2h.safety-1m');
    expect(decodePrefs(s)).toEqual({ sel: ['housing', 'safety'], pos: { housing: 2, safety: -1 }, imp: { housing: 'high', safety: 'medium' } });
  });
  it('ignores junk in a shared link', () => {
    expect(decodePrefs('bogus9z.housing7h')).toBeNull();
  });
  it('writes a picks message a friend can read', () => {
    const t = picksText([{ office: 'U.S. House', pick: 'Ruth Kessler' }, { office: 'District Court', pick: null }], '2026-11-03');
    expect(t).toContain('Nov 3');
    expect(t).toContain('• District Court: deciding myself');
  });
});

describe('ballot plumbing', () => {
  it('maps offices to the issues they decide', () => {
    expect(issuesForOffice('School Board Trustee Place 2')).toEqual(['schools', 'tax']);
    expect(issuesForOffice('Justice, Supreme Court Place 4')).toEqual(['judicial']);
    expect(issuesForOffice('U.S. Representative, District 7')).toContain('abortion');
  });
  it('matches candidate names regardless of order and punctuation', () => {
    expect(nameKey('Kessler, Ruth A.')).toBe(nameKey('Ruth A Kessler'));
  });
});

describe('abuse limits', () => {
  it('allows up to the limit per key, then blocks', async () => {
    const { allow } = await import('../lib/ratelimit');
    const results = Array.from({ length: 4 }, () => allow('test:1.2.3.4', 3));
    expect(results).toEqual([true, true, true, false]);
    expect(allow('test:5.6.7.8', 3)).toBe(true);
  });
  it('caps paid AI calls per minute', async () => {
    const { aiBudgetAvailable } = await import('../lib/ratelimit');
    const results = Array.from({ length: 3 }, () => aiBudgetAvailable(2));
    expect(results).toEqual([true, true, false]);
  });
  it('rejects oversized bodies from the header alone', async () => {
    const { tooLarge } = await import('../lib/ratelimit');
    expect(tooLarge(new Request('http://x', { method: 'POST', headers: { 'content-length': '9000' } }), 8000)).toBe(true);
  });
});
