import { describe, expect, it } from 'vitest';
import { refTag } from '../lib/ref';

describe('refTag', () => {
  it('reads the post tag from the link', () => {
    expect(refTag('?ref=li-pb-note')).toBe('li-pb-note');
    expect(refTag('?x=1&ref=X-1102-2')).toBe('x-1102-2');
  });

  it('counts nothing without a tag or with one that is not ours', () => {
    expect(refTag('')).toBeNull();
    expect(refTag('?ref=')).toBeNull();
    expect(refTag('?ref=a%20b')).toBeNull();
    expect(refTag('?ref=' + 'a'.repeat(25))).toBeNull();
    expect(refTag('?ref=1315 10th St')).toBeNull();
  });
});
