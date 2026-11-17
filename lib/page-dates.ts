import { execFileSync } from 'node:child_process';

/**
 * The day (YYYY-MM-DD) of the newest commit that touched any of these paths, so page dates
 * never need typing by hand. Undefined when full git history isn't there (no .git, or a shallow
 * clone, where the oldest commit would wrongly claim every file). Runs at build time only.
 */
export function lastChanged(paths: string[]): string | undefined {
  try {
    const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (git(['rev-parse', '--is-shallow-repository']) !== 'false') return undefined;
    return git(['log', '-1', '--format=%cs', '--', ...paths]) || undefined;
  } catch {
    return undefined;
  }
}

/** The latest of some YYYY-MM-DD dates, ignoring missing ones. */
export function newest(...dates: (string | undefined)[]): string | undefined {
  return dates.filter((d): d is string => !!d).sort().at(-1);
}
