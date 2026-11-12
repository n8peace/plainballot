import { describe, expect, it } from 'vitest';
import { fileToContest, PositionsFileSchema } from '../lib/ballot/positions';
import { VOICE_LABEL } from '../lib/types';

const file = (voice?: string) => ({
  office: 'U.S. House', district: 'California District 10', division: 'ca/cd-10', level: 'federal', kind: 'candidate', checkedAt: '2026-11-11', reviewed: false,
  issues: ['housing'],
  choices: [{
    name: 'Pat Example',
    stances: {
      housing: {
        toward: 'building more housing', strength: 'lean', text: 'Said the city should allow more homes.',
        quote: 'we need more homes near transit', sourceUrl: 'https://example.com/a', agreement: '3/3',
        ...(voice ? { voice } : {}),
      },
    },
  }],
});

describe('whose words a quote is', () => {
  it('carries an agreed label through to the ballot', () => {
    const f = PositionsFileSchema.parse(file('own'));
    expect(fileToContest(f).choices[0].stances.housing?.voice).toBe('own');
  });

  it('shows no label when the research has none (never a guess)', () => {
    const f = PositionsFileSchema.parse(file());
    expect(fileToContest(f).choices[0].stances.housing?.voice).toBeUndefined();
  });

  it('rejects a label outside the three categories', () => {
    expect(PositionsFileSchema.safeParse(file('endorsed')).success).toBe(false);
  });

  it('has a plain label for each category, none praising or faulting', () => {
    expect(Object.keys(VOICE_LABEL).sort()).toEqual(['own', 'record', 'reported']);
    for (const label of Object.values(VOICE_LABEL)) expect(label).not.toMatch(/trust|verified|reliable|only|just/i);
  });
});
