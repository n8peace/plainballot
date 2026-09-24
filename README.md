# Plain Ballot

Every race on your ballot, matched to what you care about, with the reasons shown. Free, open source and nonpartisan.

You pick the issues that matter to you and set a dial for each, or describe your priorities in your own words. Plain Ballot goes through your whole ballot, from Congress to school board, judges and ballot measures, and shows the closest match in each contest, the main reason for it, and what would change it.

## How it stays fair

- **Matching is arithmetic, not AI.** It runs in the voter's browser: weighted distance between their dials and each candidate's sourced positions ([lib/match.ts](lib/match.ts)). The same answers always produce the same ballot.
- **The dial wording is public** ([lib/issues.ts](lib/issues.ts)). Each end is worded the way its own supporters would say it.
- **No guessing.** If a candidate has no sourced position on an issue, that issue is left out and the voter is told.
- **Judges** are matched only on their record: written opinions or sentencing data.
- **Every claim is checked.** Research output is thrown away unless its quote appears word for word in the source, and a person reviews each file before it's published.

## Where AI is used

| Step | When | Model (default) | Cost |
|---|---|---|---|
| Turn a voter's words into dial settings ([lib/ai/interpret.ts](lib/ai/interpret.ts)) | Per voter, only if they type | `anthropic/claude-haiku-4.5` | ~$0.003 |
| Research candidate positions from sources ([lib/ai/research.ts](lib/ai/research.ts)) | Once per contest, offline | `anthropic/claude-sonnet-5` | ~$0.05 per candidate |

Both calls go through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) with zero data retention requested. Nothing a voter types is stored.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then add your keys
npm run dev                  # http://localhost:3000
```

Without any keys the site runs on a fictional sample ballot and the dials work. Add `AI_GATEWAY_API_KEY` to turn on "In your own words", and `GOOGLE_CIVIC_API_KEY` to look up real ballots by address.

```bash
npm test          # matching, quote checks, sharing, abuse limits
npm run eval      # checks the AI puts people on the right side of each dial (calls the model)
npm run typecheck
npm run build
```

## Research a contest

1. Write a contest file listing each candidate's source URLs (see [data/research/example.json](data/research/example.json)).
2. `npm run research -- data/research/your-contest.json`
3. Open the new file in `data/positions/`. Check every claim against its quote and source, fix or delete anything wrong, then set `"reviewed": true`.

Only reviewed files are shown on the site. `SHOW_UNREVIEWED=1` shows unreviewed ones locally.

## Deploy

The site is built for Vercel: import the repo and set `AI_GATEWAY_API_KEY` and `GOOGLE_CIVIC_API_KEY` in the project's environment variables. Abuse and DDoS protection is layered: platform DDoS mitigation, WAF rate limits, BotID, per-visitor limits and a spending cap. See [docs/security.md](docs/security.md).

## License

AGPL-3.0. Anyone may run their own copy, but a hosted copy must publish its changes, so nobody can quietly run a biased version.
