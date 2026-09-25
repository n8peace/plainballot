# How Plain Ballot is built

Two separate projects: **research** happens ahead of time in [open-election-data](https://github.com/n8peace/open-election-data) and produces open data with a free API; **the site** reads those files and matches them to a voter in the browser. No AI runs between a voter's dials and their results.

```mermaid
flowchart LR
  subgraph Research["Research (open-election-data repo)"]
    L["Official candidate list<br/>npm run ca:list"] --> I["Contest inputs<br/>data/research/"]
    I --> A["3 independent agents<br/>Claude Code · Codex · API model"]
    A --> V{"Quote found on the<br/>cited page?"}
    V -- no --> X[Dropped]
    V -- yes --> C{"Agents agree?"}
    C -- "not yet" --> A
    C -- yes --> P["Open data + free API<br/>ODbL"]
  end

  subgraph Site["The site (plainballot.com)"]
    U["Voter: issues + dials<br/>or their own words"] --> M
    AD["Address"] --> G["Census geocoder → districts<br/>lib/address/census.ts"]
    G --> B["Contests for those districts<br/>lib/ballot/"]
    P --> B
    B --> M["Matching (arithmetic, in the browser)<br/>lib/match.ts"]
    M --> R["Ballot with fit %, reasons, quotes"]
  end

  R -- "Not right?" --> Q["GitHub issue → fresh agents recheck<br/>open-election-data"]
  Q --> P
  N["Nightly: refetch every source<br/>open-election-data"] --> P
```

## The pieces

| Piece | What it does | Code |
|---|---|---|
| Dials | 18 issues, each end worded the way its supporters would say it | [lib/issues.ts](../lib/issues.ts) |
| Own words | A small model reads a voter's sentence into dial settings. It names sides in words; code converts them to numbers. | [lib/ai/interpret.ts](../lib/ai/interpret.ts) |
| Districts | U.S. Census geocoder turns an address into district keys like `ca/cd-10` | [lib/address/census.ts](../lib/address/census.ts) |
| Ballot | Researched contests matched by district, in printed-ballot order. A sample ballot fills in when nothing's researched. | [lib/ballot/](../lib/ballot/) |
| Matching | Weighted distance between a voter's dial and each choice's position. Unknown positions are left out, never guessed. | [lib/match.ts](../lib/match.ts) |
| Research | Agents, agreement rules and quote checks | [open-election-data](https://github.com/n8peace/open-election-data) |
| Protection | Rate limits, bot checks, spend caps, size and time limits | [docs/security.md](security.md) |

## Checks on every change

| Check | Runs | Catches |
|---|---|---|
| Tests, types, lint | Every push and pull request ([ci.yml](../.github/workflows/ci.yml)) | Broken matching, and asymmetry: mirrored dials must give mirrored results ([tests/neutrality.test.ts](../tests/neutrality.test.ts)) |
| Bias review | Every pull request ([bias-check.yml](../.github/workflows/bias-check.yml)) | Loaded wording, one-sided logic, selective research. Three models from different companies; blocks when two agree on a serious concern. |
