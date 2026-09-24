# Contributing to Plain Ballot

Plain Ballot is only as good as its research, and research is where you can help most. **You don't need to write code.** If you can read a candidate's website and copy a quote, you can put your own district on the map.

## Three ways to help

### 1. Research a race on your ballot (no coding, ~20 minutes)

Every contest starts as "not researched yet." Here's how to fill one in:

1. [Open a "Research a race" issue](../../issues/new?template=research-a-race.yml) so nobody duplicates your work.
2. Copy [data/positions/_template.json](data/positions/_template.json) to `data/positions/<office>-<district>.json`.
   Set `division` so the race shows up for the right voters. Enter your address on the site and the "Your districts" list tells you which one applies. Formats: `ca/cd-10` (U.S. House), `ca/sldu-9` (State Senate), `ca/sldl-15` (State House or Assembly), `ca/county-contra-costa`, `ca/place-pleasant-hill` (city), `ca/school-mount-diablo-unified`, `ca/state` (statewide).
3. For each candidate and each issue the office decides, add a position **only if you can quote the candidate's own words or record**:
   - `toward`: which side of the dial (use the exact short label from [lib/issues.ts](lib/issues.ts), e.g. `"district public schools"`), or leave the issue out.
   - `strength`: `"lean"` or `"strong"`.
   - `text`: one plain sentence a voter can read. What they did or said, with no praise or criticism.
   - `quote`: an exact passage from the source, copied character for character.
   - `sourceUrl`: where the quote is.
4. Open a pull request. Our automated check fetches every source and confirms every quote is really there.
5. Once merged, it's live. If a person has checked every claim, set `"reviewed": true` and the ballot will say so.

**Rules that keep it fair:**
- No quote, no position. Leaving an issue out is always better than guessing.
- Never infer from party, endorsements or what similar candidates believe.
- Candidates' own sites, voting records, questionnaires, rulings and direct interviews are best. Opinion pieces and attack ads don't count.
- Research every candidate in the race, not just the one you like.

Have an AI Gateway key? `npm run research -- data/research/your-contest.json` does the research for you. Three independent agents on models from different AI companies must agree (seven more run if they don't, and a 6-of-10 majority decides). Then `npm run review` builds a one-page sheet so you can check every claim quickly.

### Review research (the most valuable job)

Most research is drafted by agents. What it needs most is people checking it. Run `npm run review`, open `review.html`, and for each claim confirm that the quote says what the claim says and the side of the dial is right. Comment on the pull request with anything that's wrong.

### 2. Challenge a dial's wording

Each end of every dial should read the way its own supporters would say it. If one doesn't, [open a wording challenge](../../issues/new?template=wording.yml). Wording changes are discussed in public before they're merged, and we especially want to hear from people who hold the view being described.

### 3. Improve the code

```bash
npm install
cp .env.example .env.local   # keys are optional; without them you get a sample ballot
npm run dev
npm test && npm run typecheck && npm run lint
```

Look for issues labeled [`good first issue`](../../labels/good%20first%20issue). Keep pull requests small, and include a test for anything that touches matching ([lib/match.ts](lib/match.ts)). Matching must stay deterministic: no AI in the matching path, ever.

## Neutrality

Contributors of every political view are welcome, and so is every view in the research, as long as it's sourced. Pull requests that push a side (loaded wording, cherry-picked sources, researching only one candidate) will be closed. Be kind in reviews: we're all checking facts, not arguing politics.

## License

By contributing, you agree your contribution is licensed under [AGPL-3.0](LICENSE).
