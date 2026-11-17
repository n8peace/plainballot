import { describe, expect, it } from 'vitest';
import { parseVerifyArgs } from '../scripts/verify';

describe('verify arguments', () => {
  it('uses the voter-facing defaults', () => {
    expect(parseVerifyArgs([])).toEqual({
      url: 'http://localhost:3000',
      address: '1315 10th St, Sacramento, CA 95814',
      out: expect.stringMatching(/plainballot-verify$/),
      ownServer: true,
    });
  });

  it('parses url, address, and output overrides', () => {
    expect(parseVerifyArgs([
      '--url', 'https://example.test/root/',
      '--address', '1 Main St, Sacramento, CA 95814',
      '--out', '/tmp/ballot-shots',
    ])).toEqual({
      url: 'https://example.test/root',
      address: '1 Main St, Sacramento, CA 95814',
      out: '/tmp/ballot-shots',
      ownServer: false,
    });
  });

  it('rejects unknown flags, missing values, and invalid URLs', () => {
    expect(() => parseVerifyArgs(['--wat', 'yes'])).toThrow('Unknown argument');
    expect(() => parseVerifyArgs(['--address'])).toThrow('Missing value');
    expect(() => parseVerifyArgs(['--url', 'plainballot.test'])).toThrow('Invalid URL');
  });
});
