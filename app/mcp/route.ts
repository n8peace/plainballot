// Plain Ballot for AI agents: an MCP server at https://plainballot.com/mcp.
// Read-only. The same data and the same arithmetic as the site, with no model in the loop:
// a voter's agent looks up their ballot, reads where each choice stands (with the quote and
// source), and can score fit against the voter's own stated priorities.

import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { BallotLookupError, getBallot } from '@/lib/ballot';
import { ISSUE_IDS, ISSUES, issueById, NEITHER, toPosition, type IssueId } from '@/lib/issues';
import { score } from '@/lib/match';
import { allow, clientIp } from '@/lib/ratelimit';
import { DATA_REPO_URL, SITE_URL } from '@/lib/share';
import type { Ballot, Prefs } from '@/lib/types';

export const maxDuration = 30;

const INSTRUCTIONS = `Plain Ballot shows who's on a U.S. voter's November 3, 2026 ballot and where each choice stands on 18 issues, each position backed by an exact quote and a source URL. Coverage: every race in California, plus U.S. House and Senate races in all 50 states.
Rules for using it:
- Stay nonpartisan. Report positions and sources; don't tell the voter how to vote or add your own judgment of candidates.
- Quote and link sources when you state a position. A missing position means no public source was found; never fill it in or infer it from party.
- Fit scores only reflect the priorities the voter gave you. Ask the voter for their priorities; never guess them from who they are.
- Positions are researched by AI agents that had to agree, and every quote was checked against its page. Unless reviewedByPerson is true, a person hasn't checked them.
- The voter's address is only used to look up districts and isn't stored.`;

const side = (id: IssueId, pos: number) => (pos === 0 ? NEITHER : pos < 0 ? issueById[id].l : issueById[id].r);

/** The ballot in a shape agents can read: sides named in words, never signed numbers. */
function forAgents(b: Ballot) {
  return {
    election: { name: b.electionName, date: b.electionDate },
    place: b.place,
    sample: b.sample,
    notice: b.notice,
    contests: b.contests.map((c) => ({
      id: c.id,
      office: c.office,
      detail: c.sub,
      kind: c.kind,
      summary: c.summary,
      researched: c.researched,
      reviewedByPerson: !!c.reviewedByPerson,
      issues: c.issues,
      choices: c.choices.map((ch) => ({
        name: ch.name,
        party: ch.party ?? null,
        positions: Object.fromEntries(Object.entries(ch.stances).map(([id, s]) => [id, {
          side: side(id as IssueId, s!.pos),
          strength: s!.pos === 0 ? null : Math.abs(s!.pos) === 2 ? 'strong' : 'lean',
          summary: s!.text,
          quote: s!.quote ?? null,
          source: s!.sourceUrl ?? null,
          agreement: s!.agreement ?? null,
        }])),
      })),
    })),
  };
}

const mcp = createMcpHandler((server) => {
  server.registerTool('list_issues', {
    title: 'List the issues',
    description: 'The 18 issues Plain Ballot tracks. Each has two sides, each worded the way its own supporters would say it. Use the short side labels ("l" and "r") when giving priorities to score_fit.',
    inputSchema: z.object({}),
  }, async () => {
    const issues = ISSUES.map((i) => ({ id: i.id, name: i.name, sides: { [i.l]: i.left, [i.r]: i.right } }));
    return { content: [{ type: 'text', text: JSON.stringify({ issues, neither: NEITHER }) }], structuredContent: { issues } };
  });

  server.registerTool('get_ballot', {
    title: 'Get a ballot',
    description: 'Every researched race on the ballot for a U.S. street address, with each choice\'s position on the issues that office decides, the exact quote, and the source URL.',
    inputSchema: z.object({ address: z.string().min(5).max(200).describe('Full street address with city, state and ZIP') }),
  }, async ({ address }) => {
    try {
      const ballot = forAgents(await getBallot(address));
      return { content: [{ type: 'text', text: JSON.stringify(ballot) }], structuredContent: ballot };
    } catch (e) {
      const msg = e instanceof BallotLookupError ? e.message : 'Ballot lookup is down right now. Try again in a minute.';
      return { isError: true, content: [{ type: 'text', text: msg }] };
    }
  });

  server.registerTool('score_fit', {
    title: 'Score fit with the voter\'s priorities',
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
      const contests = ballot.contests.filter((c) => c.issues.some((id) => prefs.sel.includes(id))).map((c) => ({
        id: c.id,
        office: c.office,
        detail: c.sub,
        choices: c.choices.map((ch) => {
          const s = score(ch, c, prefs);
          return { name: ch.name, fit: s.match, noPositionOn: s.missing };
        }).sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1)),
      }));
      const result = { note: 'Fit compares stated positions only. It is not a recommendation or a prediction.', contests };
      return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
    } catch (e) {
      const msg = e instanceof BallotLookupError ? e.message : 'Ballot lookup is down right now. Try again in a minute.';
      return { isError: true, content: [{ type: 'text', text: msg }] };
    }
  });
}, {
  serverInfo: { name: 'plain-ballot', version: '1.0.0' },
  instructions: `${INSTRUCTIONS}\nSite: ${SITE_URL}. Open data (ODbL): ${DATA_REPO_URL}.`,
});

// Same spirit as the site's limits: generous for a voter's agent, closed to floods.
async function handler(req: Request): Promise<Response> {
  if (req.method === 'POST' && !allow(`mcp:${clientIp(req)}`, 120)) {
    return Response.json({ error: 'Too many requests in a few minutes. Wait a bit and try again.' }, { status: 429 });
  }
  return mcp(req);
}

export { handler as GET, handler as POST, handler as DELETE };

