// Plain Ballot for AI agents: an MCP server at https://plainballot.com/mcp.
// Read-only. The same data and the same arithmetic as the site, with no model in the loop:
// a voter's agent looks up their ballot, reads where each choice stands (with the quote and
// source), and can score fit against the voter's own stated priorities.

import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { BallotLookupError, getBallot } from '@/lib/ballot';
import { ISSUE_IDS, ISSUES, NEITHER, toPosition } from '@/lib/issues';
import { score } from '@/lib/match';
import { countAgent, withAgent } from '@/lib/agents';
import { forAgents, RULES, USE_NOTE } from '@/lib/agent-rules';
import { ballotState } from '@/lib/pulled';
import { allow, clientIp } from '@/lib/ratelimit';
import { DATA_REPO_URL, SITE_URL } from '@/lib/share';
import type { Prefs } from '@/lib/types';

export const maxDuration = 30;

// Every tool only reads: nothing it does changes anything for anyone, so app stores and
// clients can call it without asking the voter to confirm.
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const mcp = createMcpHandler((server) => {
  server.registerTool('list_issues', {
    title: 'List the issues',
    annotations: READ_ONLY,
    description: 'The 18 issues Plain Ballot tracks. Each has two sides, each worded the way its own supporters would say it. Use the short side labels ("l" and "r") when giving priorities to score_fit.',
    inputSchema: z.object({}),
  }, async () => {
    await countAgent('Agent tool call', { tool: 'list_issues' });
    const issues = ISSUES.map((i) => ({ id: i.id, name: i.name, sides: { [i.l]: i.left, [i.r]: i.right } }));
    return { content: [{ type: 'text', text: JSON.stringify({ issues, neither: NEITHER }) }], structuredContent: { issues } };
  });

  server.registerTool('get_ballot', {
    title: 'Get a ballot',
    annotations: READ_ONLY,
    description: 'Every researched race on the ballot for a U.S. street address, with each choice\'s position on the issues that office decides, the exact quote, and the source URL.',
    inputSchema: z.object({ address: z.string().min(5).max(200).describe('Full street address with city, state and ZIP') }),
  }, async ({ address }) => {
    await countAgent('Agent tool call', { tool: 'get_ballot' });
    try {
      const found = await getBallot(address);
      const state = ballotState(found);
      if (state) await countAgent('Agent ballot pulled', { state });
      const ballot = forAgents(found);
      return { content: [{ type: 'text', text: JSON.stringify(ballot) }], structuredContent: ballot };
    } catch (e) {
      const msg = e instanceof BallotLookupError ? e.message : 'Ballot lookup is down right now. Try again in a minute.';
      return { isError: true, content: [{ type: 'text', text: msg }] };
    }
  });

  server.registerTool('score_fit', {
    title: 'Score fit with the voter\'s priorities',
    annotations: READ_ONLY,
    description: 'How closely each choice on the voter\'s ballot fits the priorities the voter stated, from 0 to 100. Plain arithmetic, the same as plainballot.com: issues where a choice has no sourced position are left out, never guessed. Only use priorities the voter actually gave you.',
    inputSchema: z.object({
      address: z.string().min(5).max(200),
      priorities: z.array(z.object({
        issue: z.enum(ISSUE_IDS),
        side: z.string().describe('A side label from list_issues, or "neither side"'),
        strength: z.enum(['lean', 'strong']).default('lean'),
        importance: z.enum(['low', 'medium', 'high']).default('medium'),
      })).min(1).max(18),
    }),
  }, async ({ address, priorities }) => {
    await countAgent('Agent tool call', { tool: 'score_fit' });
    const prefs: Prefs = { sel: [], pos: {}, imp: {} };
    for (const p of priorities) {
      const pos = toPosition(p.issue, p.side, p.strength);
      if (pos === null) return { isError: true, content: [{ type: 'text', text: `"${p.side}" isn't a side of ${p.issue}. Use one of the labels from list_issues.` }] };
      prefs.sel.push(p.issue);
      prefs.pos[p.issue] = pos;
      prefs.imp[p.issue] = p.importance;
    }
    try {
      const ballot = await getBallot(address);
      const state = ballotState(ballot);
      if (state) await countAgent('Agent ballot pulled', { state });
      const contests = ballot.contests.filter((c) => c.issues.some((id) => prefs.sel.includes(id))).map((c) => ({
        id: c.id,
        office: c.office,
        detail: c.sub,
        choices: c.choices.map((ch) => {
          const s = score(ch, c, prefs);
          return { name: ch.name, fit: s.match, noPositionOn: s.missing };
        }).sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1)),
      }));
      const result = { note: `Fit compares stated positions only. It is not a recommendation or a prediction. ${USE_NOTE}`, contests };
      return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
    } catch (e) {
      const msg = e instanceof BallotLookupError ? e.message : 'Ballot lookup is down right now. Try again in a minute.';
      return { isError: true, content: [{ type: 'text', text: msg }] };
    }
  });
}, {
  serverInfo: { name: 'plain-ballot', version: '1.0.0' },
  instructions: `${RULES}\nSite: ${SITE_URL}. Open data (ODbL): ${DATA_REPO_URL}.`,
});

// Same spirit as the site's limits: generous for a voter's agent, closed to floods.
async function handler(req: Request): Promise<Response> {
  if (req.method === 'POST' && !allow(`mcp:${clientIp(req)}`, 120)) {
    return Response.json({ error: 'Too many requests in a few minutes. Wait a bit and try again.' }, { status: 429 });
  }
  return withAgent(req, () => mcp(req));
}

export { handler as GET, handler as POST, handler as DELETE };

