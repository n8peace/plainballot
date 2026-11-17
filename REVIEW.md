# Review rules

Each rule is a mistake that already reached voters or the live site. Every rule names what to look for in a diff. When a diff matches a trigger, check that case on purpose, in the real site (`npm run verify`), before merging.

A new miss gets a check that fails on that exact case first, then the fix. When the same kind of miss happens twice, it gets a line here.

| # | When the diff... | Check this | Past misses |
|---|---|---|---|
| 1 | changes copy that says what a quote is ("own words", "in their words", "said", "quoted") | The words match the quote labels in the data. Many quotes are a reporter's, a campaign bio's or a vote record's words, not the candidate's. | #86 deck said "in the candidate's own words"; #112 home said "Their own words" |
| 2 | adds `white-space: nowrap`, a fixed `width`, or `min-width` on text | Open the longest real ballot (Sacramento City Hall) at 360 px wide. The page must not scroll sideways. | #112 results page was 810 px wide on a 360 px phone |
| 3 | adds a button, link or control, or shrinks padding on one | On a touch screen the tap area is at least 44 px tall. | #115 stance buttons and source links were 17 to 25 px |
| 4 | adds or changes a color, placeholder or error style | Check contrast in both light and dark mode (4.5:1 for text). | #86 dark error text 2.6:1; #115 dark placeholder 4:1 |
| 5 | changes who leads, sorting, or "top match" logic in `lib/match.ts` or the ballot views | A tie shows no leader. A dial the voter has not set counts for nothing, not for "neither side". Add a test. | #86 tie underlined the first name; unset dial gave two backers 50% each |
| 6 | changes a status label shown with research ("Not researched yet", "No positions") | The label agrees with what is shown beside it. Researched items never say "not researched". | #86 all 14 measures said "Not researched yet" under their summary |
| 7 | builds text from a count (`${n} issue`) | Singular and plural both read right (1 issue, 2 issues). | #86 "1 issues" |
| 8 | edits a `concurrency:` block in a workflow | Runs on `main` are never cancelled by a newer push. Each push to `main` gets its own group. | Nov 17 review: a shared group would have cancelled waiting `main` runs |

## Checks a change cannot grade

- The bias review runs the reviewer from `main`, never from the pull request.
- The "Rules from main" CI job runs `main`'s tests against the change and lists any check files the change edits. It only logs for now. A change that edits its own check does not count as checked: say so in the pull request and have the check reviewed on its own.
- Every commit and pull request says how it was checked: `Verified: <what you ran or looked at>`, or `Verified: none` and why.
