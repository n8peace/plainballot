// Prints Plain Ballot's product-market fit score from Vercel Web Analytics counts.
//   npm run pmf            (needs the Vercel CLI, signed in; read-only)
// Counts only. Browsers marked as ours (?team=1) send nothing, so Nate and test runs are left out
// from 2026-11-17 on. Agent lookups are reported on their own line, never as people.
import { execFileSync } from 'node:child_process';
import { pmfScore, scoreSignals, type PmfInputs } from '../lib/pmf';
import { event, query, rows, span, sum } from './web-analytics';

// An election is the natural cycle. "Come back" = browsers that pulled a ballot last election
// and pulled one again in the next. Add the next election here when its ballots go live.
const LAST_ELECTION = { since: '2026-10-01', until: '2026-11-10' };
const NEXT_ELECTION_SINCE = '2026-11-11';
// Ballot pulls were first counted on this day; a window that starts earlier can't say who pulled one.
const PULLS_COUNTED_SINCE = new Date('2026-10-27T00:00:00Z');

const day = (d: Date) => d.toISOString().slice(0, 10);

// The last 4 full weeks, Monday to Sunday, in UTC.
const now = new Date();
const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
const start = new Date(end.getTime() - 28 * 864e5);
const lastWeek = new Date(end.getTime() - 7 * 864e5);

const weekly = rows(query('visits', 'aggregate', { by: 'week', ...span(start, end) })).map((r) => r.visitors);
const fromShares = sum(rows(query('events', 'aggregate', { by: 'eventName', filter: event('Visit from post'), ...span(start, end) })), 'visitors');
const actives = sum(rows(query('visits', 'aggregate', { by: 'week', ...span(lastWeek, end) })), 'visitors');
const pulledLastWeek = sum(rows(query('events', 'aggregate', { by: 'eventName', filter: event('Ballot pulled'), ...span(lastWeek, end) })), 'visitors');
const base = sum(rows(query('events', 'aggregate', { by: 'eventName', filter: event('Ballot pulled', " and eventData/first eq 'yes'"), ...span(LAST_ELECTION.since, LAST_ELECTION.until) })), 'count');
const returned = sum(rows(query('events', 'aggregate', { by: 'eventName', filter: event('Ballot pulled', " and eventData/returning eq 'yes'"), ...span(NEXT_ELECTION_SINCE, end) })), 'count');
const payFrom = new Date(end.getTime() - 60 * 864e5), payTo = new Date(end.getTime() - 30 * 864e5);
const payCounted = payFrom >= PULLS_COUNTED_SINCE;
const starters = !payCounted ? 0 : sum(rows(query('visits', 'aggregate', { by: 'week', ...span(payFrom, payTo) })), 'visitors');
const tookStep = !payCounted ? 0 : sum(rows(query('events', 'aggregate', { by: 'eventName', filter: event('Ballot pulled'), ...span(payFrom, payTo) })), 'visitors');

// Check: count ballot pulls a second way (one total against the weekly rows) before trusting them.
const pullsByWeek = sum(rows(query('events', 'aggregate', { by: 'week', filter: event('Ballot pulled'), ...span(start, end) })), 'count');
const pullsTotal = sum(rows(query('events', 'count', { filter: event('Ballot pulled'), ...span(start, end) })), 'count');

const agentCalls = sum(rows(query('events', 'aggregate', { by: 'eventName', filter: event('Agent tool call'), ...span(start, end) })), 'count');
const agentPulls = sum(rows(query('events', 'aggregate', { by: 'eventName', filter: event('Agent ballot pulled'), ...span(start, end) })), 'count');

const inputs: PmfInputs = {
  comeBack: { base, returned },
  habit: { actives, pulled: pulledLastWeek },
  pull: { weekly, fromShares },
  pay: { starters, tookStep },
  love: { answers: 0, veryDisappointed: 0 }, // no survey yet
};
const signals = scoreSignals(inputs);
const { score, stage } = pmfScore(signals);

console.log(`Weeks ${day(start)} to ${day(new Date(end.getTime() - 864e5))}`);
console.log(JSON.stringify(inputs));
if (pullsByWeek !== pullsTotal) console.log(`CHECK FAILED: ballot pulls ${pullsByWeek} by week vs ${pullsTotal} in total. Fix before reporting.`);
else console.log(`Check: ballot pulls agree two ways (${pullsTotal}).`);
console.log(`Plain Ballot: PMF ${score}/100, ${stage}. ${signals.map((s) => `${s.name} ${s.points} (${s.note})`).join(', ')}. Paid installs: none (no ads).`);
console.log(`Agents (not people): ${agentCalls} tool calls, ${agentPulls} ballots pulled in the last 4 weeks.`);

// The score for our checks (REVIEW.md): changes undone on main in the last 7 days. Each one is a
// miss the checks let through, and should become a test or a REVIEW.md line.
try {
  const reverts = execFileSync('git', ['log', 'origin/main', '--since=7 days ago', '-i', '--grep=^revert', '--grep=roll back', '--grep=rollback', '--oneline'], { encoding: 'utf8' }).trim();
  const n = reverts ? reverts.split('\n').length : 0;
  console.log(`Checks: ${n} revert${n === 1 ? '' : 's'} or rollback${n === 1 ? '' : 's'} on main in the last 7 days.${n ? `\n${reverts}` : ''}`);
} catch {
  console.log('Checks: could not read git history for reverts.');
}
