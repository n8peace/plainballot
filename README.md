<div align="center">

# Plain Ballot

**Every race on your ballot, matched to what you care about. With a source for every claim.**

[plainballot.com](https://plainballot.com) · [How it works](https://plainballot.com/methodology) · [Research your state](CONTRIBUTING.md)

[![CI](https://github.com/n8peace/plainballot/actions/workflows/ci.yml/badge.svg)](https://github.com/n8peace/plainballot/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-black)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/n8peace/plainballot?style=social)](https://github.com/n8peace/plainballot/stargazers)

<img src="docs/img/preview.png" alt="Plain Ballot" width="720">

</div>

Pick the issues you care about and set a dial for each. Enter your address. Plain Ballot goes through your whole ballot, from Congress to the Assembly to the propositions, and shows who fits you, why, and where that came from. Party labels stay hidden until you ask for them.

Free. No ads, no account, nothing stored. Covering California for Nov 3, 2026.

## AI that has to show its work

Chatbots get voting facts wrong. Plain Ballot is built so no single model's word ever reaches a voter.

- **Agents have to agree.** Every candidate is researched by independent agents on different models (Claude Code, Codex, GPT-5.6 Luna), each searching and reading on its own. A position is published only when they agree: 2 of 3 with no conflict, or a clear majority of 10 when they don't.
- **Every quote is verified.** Each claim carries an exact quote, fetched from its source and matched word for word, or it's thrown out. A nightly job rechecks every published quote.
- **No guessing.** An agent not finding a source never counts as a vote. No majority means the issue stays blank, and the ballot says so.
- **Matching isn't AI.** It's plain, deterministic arithmetic in your browser ([lib/match.ts](lib/match.ts)). Same answers, same ballot, every time.
- **Voters can push back.** "Not right?" on any claim files a public issue and reruns the research with fresh agents. Corrections are public.
- **Every change is checked for bias.** Three models from different companies review each pull request for loaded wording and one-sided logic, and tests require that matching treats both ends of every dial the same.
- **Every word is public.** The dial wording ([lib/issues.ts](lib/issues.ts)), the agreement rules ([lib/research/consensus.ts](lib/research/consensus.ts)) and every researched position ([data/positions](data/positions)) live in this repo.

## Research your state with your own subscription

The research runs on your own Claude or ChatGPT plan, so anyone can add coverage without paying for API credits.

```bash
npm install
cp .env.example .env.local        # add AI_GATEWAY_API_KEY for the fallback model
npm run research:state -- CA      # reads the state's certified candidate list, then researches every race
```

It shells out to `claude -p` and `codex exec`, verifies every quote itself, and falls back to an API model when your plan hits its usage limit. Open a pull request with the results; CI refetches every source and fails any quote it can't find. There's an open ["research your state" issue](https://github.com/n8peace/plainballot/issues?q=is%3Aopen+label%3Aresearch) for each of the 50 states and D.C.

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run dev                        # http://localhost:3000
```

Without keys, it runs on a fictional sample ballot and the dials still work. Keys turn on typed priorities (`AI_GATEWAY_API_KEY`), real ballot lookup (`GOOGLE_CIVIC_API_KEY`) and address suggestions (`GOOGLE_PLACES_API_KEY`).

```bash
npm test               # matching, agreement rules, quote checks, sharing, abuse limits
npm run eval           # does the AI put people on the right side of each dial? (calls the model)
npm run check:research # refetch every source and verify every quote
```

## How it's built

Next.js on Vercel. The Census geocoder finds a voter's districts. Researched races are JSON files in `data/positions`, matched to voters by district. BotID, rate limits and a spending cap protect the paid endpoints ([docs/security.md](docs/security.md)). The full picture, with a diagram: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Coding with an AI agent? Point it at [AGENTS.md](AGENTS.md).

## Contributing

The most useful help is research and checking research, and neither needs code. See [CONTRIBUTING.md](CONTRIBUTING.md), or open a ready-to-run copy in your browser:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/n8peace/plainballot)

## License

AGPL-3.0. Anyone can run their own copy, but a hosted copy has to publish its changes, so nobody can quietly run a biased version.

## Star history

[![Star history](https://api.star-history.com/svg?repos=n8peace/plainballot&type=Date)](https://star-history.com/#n8peace/plainballot&Date)
