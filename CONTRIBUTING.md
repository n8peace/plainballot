# Contributing to Plain Ballot

Plain Ballot is the voter guide. Its research lives in a separate open project, and that's where you can help most.

## Ways to help

### Research races, check research, or challenge a dial's wording

All of that happens in **[Open Election Data](https://github.com/n8peace/open-election-data)**, the open research this site is built on. No code needed: if you can read a candidate's website and copy a quote, you can put your district on the map. Start with its [contributing guide](https://github.com/n8peace/open-election-data/blob/main/CONTRIBUTING.md).

### Improve the site

```bash
npm install
cp .env.example .env.local   # keys are optional; without them you get a sample ballot
npm run dev
npm test && npm run typecheck && npm run lint
```

Or skip the setup: **Code → Codespaces → Create codespace** on GitHub opens a ready-to-run copy in your browser.

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) shows how the pieces fit. AI coding agents: start with [AGENTS.md](AGENTS.md).

Look for issues labeled [`good first issue`](../../labels/good%20first%20issue). Keep pull requests small, and include a test for anything that touches matching ([lib/match.ts](lib/match.ts)). Matching must stay deterministic: no AI in the matching path, ever.

## Neutrality

Contributors of every political view are welcome, and so is every view in the research, as long as it's sourced. Pull requests that push a side (loaded wording, cherry-picked sources, researching only one candidate) will be closed.

Every pull request gets an automatic bias review: three AI models from different companies read the change, and a concern counts only when two of them raise it. A serious one blocks the merge until it's fixed or a maintainer overrides it. It's a second pair of eyes, not the final word; if it gets something wrong, say so in the pull request. The tests also check that matching treats both ends of every dial exactly the same ([tests/neutrality.test.ts](tests/neutrality.test.ts)).

See the [code of conduct](CODE_OF_CONDUCT.md). Found a security problem? See [SECURITY.md](SECURITY.md) instead of opening an issue. Be kind in reviews: we're all checking facts, not arguing politics.

## License

By contributing, you agree your contribution is licensed under [AGPL-3.0](LICENSE).
