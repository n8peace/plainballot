import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMPARE_FAQ } from '../lib/compare';

const page = readFileSync('app/compare/page.tsx', 'utf8');

describe('comparison page', () => {
  it('asks the question word for word, as the heading and as FAQ data', () => {
    expect(COMPARE_FAQ.q).toBe('How is Plain Ballot different from Ballotpedia, VOTE411 and BallotReady?');
    expect(page).toContain('{COMPARE_FAQ.q}</h1>');
    expect(page).toContain("'@type': 'FAQPage'");
  });

  it('links each guide and the page of its own that each description comes from', () => {
    for (const url of ['https://news.ballotpedia.org/about', 'https://www.vote411.org/about', 'https://www.ballotready.org/research-process']) {
      expect(page).toContain(`href="${url}"`);
    }
  });

  it('credits, never ranks or criticizes, and says its own coverage is narrower', () => {
    const text = page + COMPARE_FAQ.a;
    expect(text).not.toMatch(/\b(best|better than|first|the only|official|unlike|worse|biased|inaccurate)\b/i);
    expect(text).toContain('Its coverage is narrower');
    expect(COMPARE_FAQ.a).toContain('Every race in California, plus U.S. House and Senate races in all 50 states.'.replace('Every', 'every'));
  });
});
