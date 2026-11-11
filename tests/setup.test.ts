import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RULES } from '../lib/agent-rules';
import { ISSUES } from '../lib/issues';
import { CURSOR_INSTALL_URL, MCP_URL, SETUP_MD, SETUP_PROMPT, SETUP_URL } from '../lib/setup';
import { GET } from '../app/setup.md/route';

describe('setup guide', () => {
  it('is served as markdown at /setup.md', async () => {
    const res = GET();
    expect(res.headers.get('content-type')).toContain('text/markdown');
    expect(await res.text()).toBe(SETUP_MD);
  });

  it('points at our own server and carries the same rules the MCP server sends', () => {
    expect(SETUP_URL).toBe('https://plainballot.com/setup.md');
    expect(MCP_URL).toBe('https://plainballot.com/mcp');
    expect(SETUP_MD).toContain(SETUP_URL);
    expect(SETUP_MD).toContain(RULES);
    expect(SETUP_MD).toMatch(/never tells anyone how to vote/);
  });

  it('has numbered steps and a pass/fail check that matches the issue count', () => {
    expect(SETUP_MD).toMatch(/^1\. Claude Code/m);
    expect(SETUP_MD).toContain(`Pass: it returns ${ISSUES.length} issues.`);
    expect(SETUP_MD).toMatch(/Already set up\?/);
  });

  it('gives Cursor a link whose config is just our server URL', () => {
    const config = new URL(CURSOR_INSTALL_URL).searchParams.get('config')!;
    expect(JSON.parse(Buffer.from(config, 'base64').toString())).toEqual({ url: MCP_URL });
  });

  it('is linked from the AI-readable page', () => {
    expect(SETUP_PROMPT).toContain(SETUP_URL);
    expect(readFileSync('public/llms.txt', 'utf8')).toContain(SETUP_URL);
  });
});
