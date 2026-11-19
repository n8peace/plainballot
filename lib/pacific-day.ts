// Day boundaries in Pacific time, for counts like "yesterday" in the daily number.

const PT = 'America/Los_Angeles';
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: PT, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** The instant a Pacific calendar day (YYYY-MM-DD) starts, whichever of PST or PDT is in force. */
export function pacificMidnight(day: string): Date {
  for (const offset of ['-08:00', '-07:00']) {
    const t = new Date(`${day}T00:00:00${offset}`);
    const hour = new Intl.DateTimeFormat('en-US', { timeZone: PT, hour: '2-digit', hourCycle: 'h23' }).format(t);
    if (ymd(t) === day && hour === '00') return t;
  }
  throw new Error(`no Pacific midnight for ${day}`);
}

/** The Pacific day `days` before the one `now` falls in, as YYYY-MM-DD. */
export function pacificDayBefore(now: Date, days: number): string {
  const [y, m, d] = ymd(now).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
}
