import { describe, expect, it } from 'vitest';
import { agentClient } from '../lib/agents';
import { forAgents, RULES, USE_NOTE } from '../lib/agent-rules';
import { ballotState } from '../lib/pulled';
import type { Ballot } from '../lib/types';

describe('agentClient', () => {
  it('names the AI app from its User-Agent', () => {
    expect(agentClient('Claude-User (claude-code/2.1; +https://support.anthropic.com/)')).toBe('claude');
    expect(agentClient('openai-mcp/1.0.0')).toBe('chatgpt');
    expect(agentClient('Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)')).toBe('chatgpt');
    expect(agentClient('Cursor/1.4')).toBe('cursor');
  });

  it('counts anything else, or nothing, as other', () => {
    expect(agentClient('node')).toBe('other');
    expect(agentClient(null)).toBe('other');
  });
});

describe('ballotState', () => {
  const ballot = (districts?: Ballot['districts']): Ballot => ({
    electionName: 'General Election', electionDate: '2026-11-03', place: 'Austin', sample: false, contests: [], districts,
  });

  it('gives only the 2-letter state', () => {
    expect(ballotState(ballot([{ key: 'tx/cd-37', label: 'U.S. House District 37' }]))).toBe('TX');
  });

  it('gives nothing when no districts were found', () => {
    expect(ballotState(ballot())).toBeNull();
  });
});

describe('agent rules', () => {
  const ballot = { electionName: 'General', electionDate: '2026-11-03', place: 'Austin, TX', sample: false, contests: [] } as unknown as Ballot;

  it('tell agents never to pair the data with a partisan take', () => {
    expect(RULES).toMatch(/never pair plain ballot's data with a partisan take/i);
    expect(USE_NOTE).toMatch(/never pair them with a partisan take/i);
  });

  it('tell agents to say which answers came from their own search', () => {
    expect(RULES).toMatch(/which positions came from your own search/i);
    expect(USE_NOTE).toMatch(/from your own search, tell the voter which ones did not come from Plain Ballot/i);
  });

  it('put the note on every ballot answer, since many apps drop server instructions', () => {
    expect(forAgents(ballot).note).toBe(USE_NOTE);
  });
});
