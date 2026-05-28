# Plan: News Aggregator — Git as a Database, GitHub as the Platform

## Vision

A news aggregator website where GitHub Actions workflows use HTTP crawlers and LLMs to fetch, process, and summarise web content. Processed content is stored on a **storage branch** (not main) so that every workflow run commits data without PR noise. The website reads this data anonymously via `raw.githubusercontent.com`. A round-trip feedback loop exists: GitHub Discussions can trigger workflows which crawl content and commit results back to the storage branch.

This plan describes the architecture, compares persistence options, and analyses how **repository0** could feasibly develop from its seed into such a system using agentic-lib workflows, prompts, and tooling.

---

## Part 1: Persistence Options in GitHub Actions

### Full Comparison

| Mechanism | Max Size | Retention | Write from Actions | Publicly Readable | Queryable | Cost |
|---|---|---|---|---|---|---|
| **Git commits (main branch)** | 5GB repo soft limit | Forever | Yes (commit+push) | Yes (raw URL) | grep/jq | Free |
| **Git commits (storage branch)** | Same | Forever | Yes (push to branch) | Yes (raw URL) | grep/jq | Free |
| **Actions Cache** | 10GB per repo | 7 days unused | Yes (`actions/cache`) | No | Key-exact only | Free |
| **Actions Artifacts** | 500MB each | 90 days (configurable) | Yes (`upload-artifact`) | Via API only (auth required) | No (opaque blobs) | Free tier, then storage costs |
| **GitHub Releases** | 2GB per asset | Forever | Yes (gh CLI/API) | Yes (direct URL) | By tag only | Free |
| **GitHub Packages (npm)** | Unlimited (practical) | Forever | Yes (npm publish) | Yes (public pkg) | By version | Free for public |
| **GitHub Variables** | 48KB per var, 1000/repo | Forever | Yes (API) | No (auth required) | Key-exact | Free |
| **GitHub Issues/Discussions** | 65535 chars per body | Forever | Yes (API/GraphQL) | Yes (web + API) | GraphQL, labels, search | Free |
| **GitHub Pages** | 1GB site | Forever | Yes (deploy action) | Yes (served as static) | No (static files) | Free |
| **Git Notes** | Unlimited (practical) | Forever (with refs) | Yes (git notes) | Via API only | By commit | Free |
| **Gists** | 1MB per file, 300 files | Forever | Yes (API) | Yes (public gist URL) | No | Free |
| **S3** | Unlimited | Configurable | Yes (aws CLI) | Yes (CloudFront) | No (unless indexed) | Pay-per-use |

### DynamoDB Properties We Want

Key-value lookup, structured records, durable, fast reads, queryable, no TTL pressure.

### Tier 1: Best Fits

#### Git Commits on a Storage Branch (Winner)

- **Append-only JSONL** gives structured records with full git history
- A dedicated orphan branch (e.g. `data`) keeps data out of code history entirely
- **Publicly readable** at `raw.githubusercontent.com/{org}/{repo}/data/{file}.jsonl` — no auth needed for public repos
- Workflows read/write with sparse checkout (fast, no code checkout needed)
- Natural "table per file" model: `feeds.jsonl`, `articles.jsonl`, `index.json`
- `jq` gives query capability within workflows
- **Concurrency**: `concurrency: { group: data-branch }` serialises pushes
- **Downsides**: Not fast for random-access reads; git push contention under high concurrency; repo size grows with history (mitigated by periodic history squash)

#### GitHub Issues/Discussions (Structured JSON in Body)

- Labels = partition key, issue/discussion number = sort key
- GraphQL gives real query capability (filter by label, search body text)
- Comments = append-only event log per record
- Already publicly readable and already used by the website
- **Downsides**: 65KB body limit, API rate limits (5000/hour authenticated), awkward for high-frequency writes

### Tier 2: Good for Specific Patterns

| Mechanism | Best For | Why Not Primary |
|---|---|---|
| **GitHub Releases** | Immutable snapshots (daily aggregates, versioned state dumps) | No append, one blob per release |
| **Actions Cache** | Intermediate computation state between runs | 7-day TTL, no public access |
| **GitHub Variables** | Config flags, cursors, small state | 48KB limit, no public access |
| **GitHub Pages** | Serving the final website (output layer) | Not a data store — reads from storage branch |
| **S3** | Escape hatch for high throughput or random access | Adds AWS dependency, costs money |

### Tier 3: Niche

| Mechanism | Assessment |
|---|---|
| **Actions Artifacts** | Temp storage between jobs. 90-day retention. Not a database. |
| **Git Notes** | Metadata per commit. Interesting for audit trails but poorly tooled. |
| **Gists** | Like a single-row database. Could work for global config but not tables. |
| **GitHub Packages** | Version-indexed blobs. Overkill for data storage. |

### Recommended Hybrid

```
Storage branch (JSONL)     →  Durable structured data (feeds, articles, metrics)
Issues/Discussions         →  Interactive/queryable records, user feedback loop
GitHub Variables           →  Configuration flags, cursor positions
Actions Cache              →  Ephemeral scratch space (downloaded pages before processing)
GitHub Pages               →  Output layer (website reads from storage branch, serves via Pages)
```

---

## Part 2: Storage Branch Architecture

### Branch Setup

An orphan branch with no shared history with main:

```bash
git checkout --orphan data
git rm -rf .
git commit --allow-empty -m "init data branch"
git push origin data
```

### Data Layout

```
data branch
├── feeds.jsonl              # Feed definitions (URL, name, category, schedule)
├── articles.jsonl           # Processed articles (one record per line)
├── crawl-log.jsonl          # Crawl history (timestamps, status, errors)
├── index.json               # Materialised view for the website (pre-computed)
├── cursors.json             # Last-processed positions per feed
└── categories/
    ├── tech.json            # Per-category article index
    └── science.json
```

### JSONL Record Format

```jsonl
{"id":"a1b2c3","feed":"hn","title":"...","url":"https://...","summary":"...","tags":["ai","tools"],"crawled_at":"2026-03-07T10:00:00Z","published_at":"2026-03-06T..."}
{"id":"d4e5f6","feed":"lobsters","title":"...","url":"https://...","summary":"...","tags":["systems"],"crawled_at":"2026-03-07T10:00:00Z","published_at":"2026-03-06T..."}
```

### Read/Write Pattern in Workflows

```yaml
# Write to data branch
- uses: actions/checkout@v4
  with:
    ref: data
    sparse-checkout: |
      articles.jsonl
      cursors.json
    path: data-checkout

# ... crawl and process ...

- name: Commit new articles
  run: |
    cd data-checkout
    # Append new articles
    cat ../new-articles.jsonl >> articles.jsonl
    # Rebuild index
    jq -s '.' articles.jsonl > index.json
    git add -A
    git commit -m "crawl: $(date -u +%Y-%m-%dT%H:%M:%SZ) — N new articles"
    git push origin HEAD:data
```

### Concurrency Safety

```yaml
concurrency:
  group: data-branch-write
  cancel-in-progress: false  # Don't cancel — queue instead
```

### Repo Size Management

Over time, JSONL append + git history grows the repo. Mitigations:

1. **File rotation**: `articles-2026-03.jsonl`, `articles-2026-04.jsonl` — archive old months
2. **Periodic squash**: Force-push a fresh orphan with just current state (scheduled monthly)
3. **Size caps**: Workflow checks file size before appending; rotates if > 10MB
4. **`.gitattributes`**: Mark JSONL files as binary to avoid diff overhead

### Website Access

Public repos serve raw content at:
```
https://raw.githubusercontent.com/{org}/{repo}/data/index.json
```

This has ~5 minute CDN caching. For fresher reads, use the GitHub API:
```
GET /repos/{org}/{repo}/contents/index.json?ref=data
```

Or serve from GitHub Pages (deploy from data branch or copy index.json during Pages build).

---

## Part 3: The Round-Trip — Discussions Trigger Crawls

### Flow

```
User posts in Discussion:
  "Add feed: https://lobste.rs/rss"
        │
        ▼
discussion event triggers bot workflow
        │
        ▼
Bot workflow parses the request, adds to feeds.jsonl on data branch
        │
        ▼
Scheduled crawl workflow picks up new feed, crawls it
        │
        ▼
Articles appended to articles.jsonl, index.json rebuilt
        │
        ▼
Bot replies to discussion: "Added lobste.rs — 15 articles indexed"
        │
        ▼
Website fetches updated index.json and renders new articles
```

### Discussion-Driven Commands

The discussions bot prompt can recognise structured commands:

| Command | Action |
|---------|--------|
| `add feed: <url>` | Add a new RSS/Atom feed to `feeds.jsonl` |
| `remove feed: <name>` | Mark feed as inactive in `feeds.jsonl` |
| `search: <query>` | Search `articles.jsonl` and reply with results |
| `status` | Reply with crawl stats (feeds, articles, last crawl time) |
| `refresh: <feed>` | Trigger an immediate crawl of a specific feed |

---

## Part 4: Developing This in repository0 Using agentic-lib

### The Challenge

repository0 starts from a seed: a minimal `src/lib/main.js` with `getIdentity()`, a basic `index.html`, and empty `MISSION.md`. The agentic-lib workflows (supervisor → transform → review → fix) autonomously evolve the code based on the mission. Can these workflows feasibly build a news aggregator?

### What the Agent Already Has

The agentic-step action gives the Copilot agent these tools:

| Tool | Capability |
|------|-----------|
| `read_file` | Read any file in the repo |
| `write_file` | Write to allowed paths (`src/`, `tests/`, `docs/`, `README.md`, etc.) |
| `list_files` | List directory contents |
| `run_command` | Execute shell commands (blocked: git write commands) |

The agent can:
- Write JavaScript code in `src/lib/main.js`
- Write tests in `tests/unit/`
- Write website files in `src/web/`
- Run `npm test`, `npm run build`, and other shell commands
- Read MISSION.md, SOURCES.md, package.json, and all project files

### What the Agent Cannot Do (Gaps)

| Gap | Issue | Mitigation |
|-----|-------|------------|
| **Git push to data branch** | `run_command` blocks git write commands | The workflow YAML handles git operations outside the agent — agent writes files, workflow commits them |
| **HTTP fetch** | Agent can use `run_command` with `curl`/`wget` | Works — `curl` is available in GitHub Actions runners |
| **LLM calls** | Agent IS the LLM (Copilot SDK) — it processes content inline | The agent itself summarises articles as part of its transform step |
| **Scheduled execution** | Agent needs to run on a cron | Already supported: `agentic-lib-schedule.yml` has cron triggers |
| **Data branch operations** | Agent works on main branch checkout | Workflow YAML can checkout data branch in a separate step, make files available to agent |

### Proposed MISSION.md

```markdown
# Mission

A JavaScript-based news aggregator that crawls RSS/Atom feeds, summarises articles
using the LLM, and stores results as JSONL data for a static website.

This is an ongoing mission. Do not set schedule to off.

## Core Functions

- `parseFeed(url)` — fetch and parse an RSS/Atom feed URL, return structured articles
- `summariseArticle(article)` — generate a concise summary of an article's content
- `appendArticles(articles, filePath)` — append article records as JSONL to a file
- `buildIndex(articlesPath)` — read JSONL articles and produce a JSON index grouped by category and date
- `loadFeeds(feedsPath)` — load feed definitions from a JSONL file
- `crawlAll(feedsPath, articlesPath)` — orchestrate: load feeds, parse each, summarise, append

## Requirements

- Use native `fetch()` for HTTP requests (Node 24+, no external HTTP dependencies)
- Parse RSS 2.0 and Atom 1.0 XML formats (use a lightweight XML parser or regex)
- Store articles as JSONL (one JSON object per line) for append-friendly writes
- Generate `index.json` as a materialised view for the website
- The website (`src/web/index.html`) should fetch and render `index.json`
- Handle feed errors gracefully (log and skip, don't crash the pipeline)
- Export all functions as named exports from `src/lib/main.js`
- Comprehensive unit tests with mock feed data

## Acceptance Criteria

- [ ] `parseFeed(url)` returns an array of article objects with title, url, published date
- [ ] `summariseArticle(article)` returns a shortened summary string
- [ ] `appendArticles(articles, path)` appends JSONL to a file
- [ ] `buildIndex(path)` produces a JSON object grouped by category
- [ ] `crawlAll()` orchestrates the full pipeline
- [ ] Website renders articles from index.json
- [ ] All unit tests pass
- [ ] README documents the aggregator with usage examples
```

### Proposed SOURCES.md

```markdown
# Sources

Reference material for the news aggregator.

- https://www.rssboard.org/rss-specification — RSS 2.0 specification
- https://validator.w3.org/feed/docs/atom.html — Atom feed format
- https://jsonlines.org/ — JSONL format specification
- https://developer.mozilla.org/en-US/docs/Web/API/fetch — Fetch API (Node 24+)
```

### How the Autonomous Pipeline Builds This

#### Phase 1: Supervisor Creates Issues

The supervisor reads MISSION.md and creates a comprehensive issue:
> "Implement news aggregator: parseFeed, summariseArticle, appendArticles, buildIndex, loadFeeds, crawlAll. Include unit tests with mock data, website rendering, and README."

#### Phase 2: Transform Agent Implements

The transform agent (Copilot SDK via agentic-step):
1. Reads MISSION.md, existing code, and tests
2. Writes `src/lib/main.js` with all core functions
3. Writes `tests/unit/main.test.js` with mock RSS data
4. Updates `src/web/index.html` to fetch and render `index.json`
5. Updates README.md with usage docs
6. Runs `npm test` to verify

This is feasible because:
- **Feed parsing** is straightforward JS (XML string → regex/DOMParser → objects)
- **JSONL operations** are trivial (readline + JSON.parse, or split + map)
- **Index building** is a reduce/group-by operation
- **The website** is already a seed HTML file that loads JS — extending it to render articles is natural
- **Summarisation** can be a simple truncation initially (the real LLM summarisation happens when the workflow runs crawlAll with Copilot as the active LLM)

#### Phase 3: Review and Fix

Review agent validates against acceptance criteria. Fix agent resolves any test failures.

#### Phase 4: Data Branch (Manual Setup or Workflow Extension)

The data branch and crawl scheduling require workflow-level changes beyond what the transform agent does to `src/lib/main.js`. Options:

**Option A: Manual bootstrap (minimal)**
1. Human creates the orphan `data` branch with seed `feeds.jsonl`
2. Human adds a `crawl.yml` workflow that:
   - Checks out main (for code) + data branch (for data)
   - Runs `node -e "import { crawlAll } from './src/lib/main.js'; crawlAll('data-checkout/feeds.jsonl', 'data-checkout/articles.jsonl')"`
   - Commits results to data branch
3. The existing agentic-lib workflows continue evolving the library code

**Option B: Extend agentic-lib with a data-branch action (reusable)**
Add a new reusable action/workflow to agentic-lib:
- `agentic-lib-data-commit` — checks out a data branch, runs a script, commits results
- Could be used by any repository0-based project that needs the storage branch pattern
- The supervisor agent could dispatch this workflow

**Option C: Let the agent do it via MISSION.md instructions**
The mission can instruct the agent to write workflow YAML:
- The agent has `write_file` access — but workflow files in `.github/workflows/` may not be in the writable paths
- Even if writable, new workflows need `WORKFLOW_TOKEN` (classic PAT) to push
- This is the most autonomous option but requires relaxing safety constraints

### Recommended Approach: Option A + Gradual B

1. **Start with Option A**: Write MISSION.md as above, let the agentic pipeline build the library. Manually create the data branch and a simple `crawl.yml` workflow.

2. **Graduate to Option B**: Once the pattern is proven, extract the data-branch-commit logic into a reusable agentic-lib action that any mission can use. This becomes a new feature (#28+ in FEATURES_ROADMAP.md).

### Workflow Topology

```
┌──────────────────────────────────────────────────────────────────┐
│ Existing agentic-lib workflows (evolve the code)                │
│                                                                  │
│  schedule → supervisor → create issue → transform → review      │
│                              │                                   │
│                              ▼                                   │
│                     src/lib/main.js (news aggregator library)    │
│                     tests/unit/main.test.js                      │
│                     src/web/index.html                           │
│                     README.md                                    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ New crawl workflow (uses the library to populate data)           │
│                                                                  │
│  schedule (hourly) ──→ crawl.yml                                │
│                          │                                       │
│                          ├── checkout main (code)                │
│                          ├── checkout data branch (data)         │
│                          ├── npm install                         │
│                          ├── node crawl-runner.js                │
│                          │     └── calls crawlAll() from main.js │
│                          ├── rebuild index.json                  │
│                          └── git push to data branch             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Discussion round-trip                                            │
│                                                                  │
│  User posts "add feed: <url>" in Discussion                     │
│         │                                                        │
│         ▼                                                        │
│  discussion bot workflow                                         │
│         │                                                        │
│         ├── parse command                                        │
│         ├── checkout data branch                                 │
│         ├── append to feeds.jsonl                                │
│         ├── push to data branch                                  │
│         └── reply to discussion                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Website (GitHub Pages from docs/ on main)                        │
│                                                                  │
│  index.html                                                      │
│    └── fetch('raw.githubusercontent.com/.../data/index.json')    │
│    └── render articles                                           │
└──────────────────────────────────────────────────────────────────┘
```

### What Makes This a Good Showcase

1. **The library evolves autonomously** — the agentic pipeline builds parseFeed, summariseArticle, etc. from the mission, demonstrating intentïon's core value proposition
2. **The data branch demonstrates a novel pattern** — "git as a database" is an interesting architectural choice that works within GitHub's free tier
3. **The round-trip is compelling** — a user posts a discussion, the system crawls new content, the website updates. This is a complete autonomous loop.
4. **It's a real product** — a news aggregator is useful, demonstrable, and easy to explain
5. **Zero infrastructure beyond GitHub** — no AWS, no databases, no servers. Pure GitHub.

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Agent can't parse RSS/XML well | Medium | High | Include RSS spec in SOURCES.md; allow a lightweight npm XML parser |
| Repo size grows too fast | Low | Medium | File rotation, periodic squash, size caps in crawl workflow |
| Rate limits on raw.githubusercontent.com | Low | Low | Use GitHub Pages as the read layer instead |
| Crawl workflow conflicts with agentic workflows | Low | Low | They operate on different branches (main vs data) |
| LLM summarisation quality varies | Medium | Low | Start with simple truncation; upgrade to LLM-powered summaries later |
| Feed sites block GitHub Actions IPs | Medium | Medium | Use feed URLs that are known-friendly; add User-Agent header; handle 403 gracefully |

---

## Part 5: Implementation Sequence

### Step 1: Write MISSION.md and SOURCES.md
Write the news aggregator mission. Run `init --purge` to reset repository0 to seed state with the new mission.

### Step 2: Let the Agentic Pipeline Build the Library
Activate the schedule. The supervisor creates issues, the transform agent writes code, the review agent validates. Expected: 3-5 transform cycles to reach a working library.

### Step 3: Create the Data Branch
Manually create the orphan `data` branch with seed data:
```jsonl
{"url":"https://hnrss.org/frontpage","name":"Hacker News","category":"tech","active":true}
{"url":"https://lobste.rs/rss","name":"Lobsters","category":"tech","active":true}
```

### Step 4: Add the Crawl Workflow
Add `crawl.yml` to `.github/workflows/` — a simple scheduled workflow that uses the library to crawl feeds and commit to the data branch.

### Step 5: Update the Website
Ensure `src/web/index.html` fetches from the data branch and renders articles. The agentic pipeline may have already done this if the mission is clear enough.

### Step 6: Wire Up Discussions
Extend the discussions bot prompt to recognise feed management commands and write to the data branch.

### Step 7: Observe and Iterate
Watch the system run. Tune feed list, crawl frequency, summarisation quality. Add categories, search, filtering as the mission evolves.

---

## Appendix: Key URLs

| Resource | URL Pattern |
|----------|-------------|
| Data branch raw access | `https://raw.githubusercontent.com/xn-intenton-z2a/repository0/data/{file}` |
| Website (GitHub Pages) | `https://xn-intenton-z2a.github.io/repository0/` |
| Discussions | `https://github.com/xn-intenton-z2a/repository0/discussions` |
| Workflow runs | `https://github.com/xn-intenton-z2a/repository0/actions` |
