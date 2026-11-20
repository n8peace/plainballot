---
name: verify
description: Use Plain Ballot the way a voter would, in a real browser, before any commit a voter will see and after every deploy. Pulls a sample and a real California ballot, sets a stance, opens a race page, and checks phone width. Use for "verify", "check it works", "did it break", before a merge, and once after a deploy.
---

# verify: pull a real ballot

Tests passing is not proof. This runs the real site in Chrome and does what a voter does.

## Before a commit a voter will see

```bash
npm run verify
```

It starts this checkout's own copy of the site on port 3123 (never a server already running, which may be another project), then:

1. Loads the home page with no console errors.
2. Types `sample` and pulls the sample ballot: races, candidates and source links show.
3. Pulls a real California ballot (`--address "..."` to pick one). If the lookup falls back to the sample ballot, that is a FAIL: a real ballot was not checked. It needs the keys in `.env.local`.
4. Sets one stance and checks a fit shows on a candidate.
5. Opens a race page and checks a candidate, a quote and its source link.
6. Loads the about pages and llms.txt.
7. Repeats the sample ballot at 390 px, and the real ballot at 360 px, and checks nothing scrolls sideways.

Any FAIL exits 1. Do not commit until it passes. Then look at the two screenshots it prints. A check passing and the page looking wrong is still a fail.

## After a deploy

```bash
npm run verify -- --url https://plainballot.com
```

Run it once. Never in a loop. One run makes about four ballot lookups, and the live site allows only a few per IP in a few minutes, so a second run right after the first gets "Too many lookups" (429). That is the site protecting itself, not a bug. Every page it opens carries `?team=1`, so its visits never count as voters.

## Then

- Check the diff against [REVIEW.md](../../../REVIEW.md) and test any rule it triggers by hand in the browser.
- Write how it was checked in the commit and the pull request: `Verified: npm run verify, all pass; REVIEW.md rule 2 checked at 360 px`.
- If a broken thing reached a voter, first make this script (or a test) fail on that exact case, then fix it, then add a REVIEW.md line if it is the second time.

## Random UI testers (fuzzers)

UI fuzzers run against a production build, never a dev server. Build with `npm run build`, serve with `npm run start`, and point the tool only at the site's own pages. A dev server's error screen has file links that open an editor on the computer running it: on Nov 20 a fuzzer clicked them and opened 14 Terminal windows. For now a fuzzer only reports; a real bug it finds gets fixed like any other bug.
