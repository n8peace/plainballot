import { describe, expect, it } from 'vitest';
import { pulledEvent } from '../lib/pulled';
import type { Ballot } from '../lib/types';

const ballot = (districts?: Ballot['districts']): Ballot => ({
  electionName: 'General Election', electionDate: '2026-11-03', place: 'Sacramento', sample: false, contests: [], districts,
});
const sacramento = ballot([{ key: 'ca/state', label: 'California' }, { key: 'ca/cd-7', label: 'U.S. House District 7' }]);

describe('pulledEvent', () => {
  it('sends only the state and whether this browser pulled one this election', () => {
    expect(pulledEvent(sacramento, null)).toEqual({ cycle: '2026-11', event: { state: 'CA', first: 'yes' } });
    expect(pulledEvent(sacramento, '2026-11')!.event).toEqual({ state: 'CA', first: 'no' });
  });

  it('counts a new election as a first pull', () => {
    expect(pulledEvent(sacramento, '2024-11')!.event.first).toBe('yes');
  });

  it('counts nothing when the address was not found', () => {
    expect(pulledEvent(ballot(), null)).toBeNull();
    expect(pulledEvent(ballot([]), null)).toBeNull();
  });
});
