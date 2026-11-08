import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FAQ, faqJsonLd } from '../lib/faq';

// Nate approved these six questions word for word on Nov 2, 2026. A wording change needs his yes.
const APPROVED = [
  'Does Plain Ballot tell me how to vote?',
  'What does a blank mean?',
  'Where do the positions come from?',
  'Do you store my address?',
  'What races are covered?',
  'What if something is wrong?',
];

describe('home page FAQ', () => {
  it('has the six approved questions, in order', () => {
    expect(FAQ.map((f) => f.q)).toEqual(APPROVED);
  });

  it('keeps the promises that decide trust', () => {
    const text = (i: number) => FAQ[i].a;
    expect(text(0)).toMatch(/^No\. /);
    expect(text(0)).toContain('We never recommend, endorse or rate anyone.');
    expect(text(1)).toContain('It isn’t a vote for or against anything.');
    expect(text(1)).toContain('we never fill them in from party or endorsements');
    expect(text(3)).toMatch(/^No\. Your address is used only to find your ballot\./);
    expect(text(4)).toBe('Every race in California, plus U.S. House and Senate races in all 50 states.');
  });

  it('the search tag says exactly what the page says', () => {
    const tag = faqJsonLd();
    expect(tag['@type']).toBe('FAQPage');
    expect(tag.mainEntity.map((e) => [e.name, e.acceptedAnswer.text])).toEqual(FAQ.map((f) => [f.q, f.a]));
  });

  it('is on the home page, as text and as a tag', () => {
    expect(readFileSync('components/Paper.tsx', 'utf8')).toContain('FAQ.map(');
    expect(readFileSync('app/page.tsx', 'utf8')).toContain('faqJsonLd()');
  });

  it('makes no claim of being first, best or official', () => {
    expect(JSON.stringify(FAQ)).not.toMatch(/\b(first|best|official)\b/i);
  });
});
