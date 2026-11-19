// Plain Ballot's daily number, for HQ's morning notification.
//   npm run daily          (needs the Vercel CLI, signed in; read-only)
//
// Ballots pulled: ballots looked up on plainballot.com, by people (one "Ballot pulled" event per
// lookup) plus by AI agents (one "Agent ballot pulled" event per lookup), counted by Pacific day.
// Browsers marked as ours (?team=1) send nothing, so Nate and test runs are left out from Nov 17.
// Counts only: no addresses, names or anything else about a person.
import { pacificDayBefore, pacificMidnight } from '../lib/pacific-day';
import { event, query, rows, span, sum } from './web-analytics';

const now = new Date();
const today = pacificMidnight(pacificDayBefore(now, 0));
const yesterday = pacificMidnight(pacificDayBefore(now, 1));
const weekAgo = pacificMidnight(pacificDayBefore(now, 7));

const count = (name: string, since: Date) => sum(rows(query('events', 'count', { filter: event(name), ...span(since, today) })), 'count');
const visitors = (since: Date, filter?: string) =>
  sum(rows(filter ? query('events', 'aggregate', { by: 'eventName', filter, ...span(since, today) }) : query('visits', 'count', span(since, today))), 'visitors');

function window(since: Date) {
  const people = count('Ballot pulled', since);
  const agents = count('Agent ballot pulled', since);
  return { ballotsPulled: people + agents, byPeople: people, byAgents: agents, peopleWhoPulled: visitors(since, event('Ballot pulled')), siteVisitors: visitors(since) };
}

const out = {
  app: 'Plain Ballot',
  number: 'Ballots pulled',
  definition: 'Ballots looked up on plainballot.com by people plus AI agents, per Pacific day; our own browsers excluded.',
  yesterday: { day: pacificDayBefore(now, 1), ...window(yesterday) },
  last7Days: { from: pacificDayBefore(now, 7), to: pacificDayBefore(now, 1), ...window(weekAgo) },
};
console.log(JSON.stringify(out, null, 2));
