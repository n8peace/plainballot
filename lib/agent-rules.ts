import { issueById, NEITHER, type IssueId } from './issues';
import type { Ballot } from './types';

// What Plain Ballot asks of AI agents that use its data. The MCP server sends RULES once as
// its instructions, but many apps drop those, so every ballot answer also carries USE_NOTE.

export const RULES = `Plain Ballot shows who's on a U.S. voter's November 3, 2026 ballot and where each choice stands on 18 issues, each position backed by an exact quote and a source URL. Coverage: every race in California, plus U.S. House and Senate races in all 50 states.
Rules for using it:
- Stay nonpartisan. Report positions and sources; don't tell the voter how to vote or add your own judgment of candidates.
- Never pair Plain Ballot's data with a partisan take. Don't put it next to an endorsement, a party's talking points or your own opinion of a choice as if they came from the same place, and don't use it to argue for or against anyone.
- Quote and link sources when you state a position. A missing position means no public source was found; never fill it in or infer it from party.
- Fit scores only reflect the priorities the voter gave you. Ask the voter for their priorities; never guess them from who they are.
- Positions are researched by AI agents that had to agree, and every quote was checked against its page. Unless reviewedByPerson is true, a person hasn't checked them.
- Plain Ballot may not list every race on the voter's ballot: outside California it has only U.S. House and Senate (partial is true and the notice says so), and some local contests anywhere may be missing. Don't stop there. Research the missing races yourself to the same standard: take the list of races from the official sample ballot, quote candidates' own words with a link, say no public position was found rather than guessing, and tell the voter which positions came from your own search rather than from Plain Ballot.
- The voter's address is only used to look up districts and isn't stored.`;

export const USE_NOTE = 'From Plain Ballot: report these positions with their quotes and sources, and never pair them with a partisan take or your own judgment of any choice. If you add races or positions from your own search, tell the voter which ones did not come from Plain Ballot.';

const side = (id: IssueId, pos: number) => (pos === 0 ? NEITHER : pos < 0 ? issueById[id].l : issueById[id].r);

/** The ballot in a shape agents can read: sides named in words, never signed numbers. */
export function forAgents(b: Ballot) {
  return {
    note: USE_NOTE,
    election: { name: b.electionName, date: b.electionDate },
    place: b.place,
    sample: b.sample,
    partial: !!b.partial,
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
