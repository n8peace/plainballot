# How Plain Ballot is built

Two separate paths: **research** happens ahead of time and produces reviewable JSON files; **the site** reads those files and matches them to a voter in the browser. No AI runs between a voter's dials and their results.

```mermaid
flowchart LR
  subgraph Research["Research (ahead of time, in this repo)"]
    L["Official candidate list<br/>npm run ca:list"] --> I["Contest inputs<br/>data/research/"]
    I --> A["3 independent agents<br/>Claude Code · Codex · API model"]
    A --> V{"Quote found on the<br/>cited page?"}
    V -- no --> X[Dropped]
    V -- yes --> C{"Agents agree?<br/>lib/research/consensus.ts"}
    C -- "not yet" --> A
    C -- yes --> P["data/positions/*.json"]
  end

  subgraph Site["The site (plainballot.com)"]
    U["Voter: issues + dials<br/>or their own words"] --> M
    AD["Address"] --> G["Census geocoder → districts<br/>lib/address/census.ts"]
    G --> B["Contests for those districts<br/>lib/ballot/"]
    P --> B
    B --> M["Matching (arithmetic, in the browser)<br/>lib/match.ts"]
    M --> R["Ballot with fit %, reasons, quotes"]
  end

  R -- "Not right?" --> Q["GitHub issue → fresh agents recheck<br/>.github/workflows/recheck.yml"]
  Q --> P
  N["Nightly: refetch every source<br/>.github/workflows/nightly.yml"] --> P
```

## The pieces

| Piece | What it does | Code |
|---|---|---|
| Dials | 18 issues, each end worded the way its supporters would say it | [lib/issues.ts](../lib/issues.ts) |
| Own words | A small model reads a voter's sentence into dial settings. It names sides in words; code converts them to numbers. | [lib/ai/interpret.ts](../lib/ai/interpret.ts) |
| Districts | U.S. Census geocoder turns an address into district keys like `ca/cd-10` | [lib/address/census.ts](../lib/address/census.ts) |
| Ballot | Researched contests matched by district, in printed-ballot order. A sample ballot fills in when nothing's researched. | [lib/ballot/](../lib/ballot/) |
| Matching | Weighted distance between a voter's dial and each choice's position. Unknown positions are left out, never guessed. | [lib/match.ts](../lib/match.ts) |
| Research agents | Each agent searches and reads on its own and must return an exact quote for every position | [lib/research/agent.ts](../lib/research/agent.ts), [backends.ts](../lib/research/backends.ts) |
| Agreement | 3 agents; 2 more when only one found something; 10 and a majority on a real conflict. Not finding a source is never a vote. | [lib/research/consensus.ts](../lib/research/consensus.ts) |
| Quote check | Fetches the page and requires the quote to appear, normalized for spacing and punctuation | [lib/ai/research.ts](../lib/ai/research.ts) |
| Protection | Rate limits, bot checks, spend caps, size and time limits | [docs/security.md](security.md) |

## Checks on every change

| Check | Runs | Catches |
|---|---|---|
| Tests, types, lint | Every push and pull request ([ci.yml](../.github/workflows/ci.yml)) | Broken matching, and asymmetry: mirrored dials must give mirrored results ([tests/neutrality.test.ts](../tests/neutrality.test.ts)) |
| Quote verification | Every push and pull request | A claim whose quote isn't on its source page |
| Bias review | Every pull request ([bias-check.yml](../.github/workflows/bias-check.yml)) | Loaded wording, one-sided logic, selective research. Three models from different companies; blocks when two agree on a serious concern. |
| Quote drift | Nightly ([nightly.yml](../.github/workflows/nightly.yml)) | Sources that changed or disappeared after publishing |
