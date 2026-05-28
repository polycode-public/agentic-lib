# Monetization Analysis — intentïon agentic-lib

**Note:** This is a strategic analysis document. No code changes required.

---

## Current State

- MVP complete (27 features, v7.4.16)
- Zero revenue, zero external awareness
- GPL-3.0 core + MIT distributed code (fully open source)
- Near-zero operating costs (~$20-50/month AWS)
- Users bring their own compute (GitHub Actions) and AI (Copilot SDK)

---

## Five Monetization Paths (Ranked by Feasibility)

### Path 1: Consulting & Advisory (HIGH feasibility, MEDIUM revenue)

**The natural fit.** Antony has 25+ years of enterprise delivery credibility. intentïon is a live proof-of-concept.

| Offering | Price | Target | Timeline |
|----------|-------|--------|----------|
| Autonomous dev setup workshop (1 day) | $2-5k | Engineering teams with Copilot | Now |
| MISSION.md strategy session (half day) | $1-2k | CTOs wanting to evaluate | Now |
| Ongoing autonomous dev advisor (retainer) | $3-8k/month | Teams using intentïon in production | +3 months |
| Conference speaking + sponsored workshops | $2-5k per event | DevOps/AI conferences | +3 months |

**Why this works now:** No product changes needed. The demo + expertise is the product. Equal Experts network provides warm introductions to enterprise clients (Liberty Global, Sky, NHS-scale organisations).

**Revenue potential:** $50-150k/year from 2-3 retainer clients + ad-hoc workshops.

### Path 2: GitHub Marketplace + Sponsorship (MEDIUM feasibility, LOW-MEDIUM revenue)

**Publish `agentic-step` to GitHub Marketplace** as a free action, then leverage GitHub Sponsors and the Marketplace partnership programme.

| Component | Revenue | Timeline |
|-----------|---------|----------|
| Marketplace listing (free) | Visibility, credibility | +2 weeks |
| GitHub Sponsors tier | $5-50/month per sponsor | +1 month |
| GitHub Stars programme | Access + speaking opps | +2 months |
| Featured by GitHub (partnership) | Massive visibility | +6 months |

**Sponsor tiers could offer:**
- $5/mo: Name in README + intentïon.md logs
- $20/mo: Priority mission seed requests (you suggest missions, we add them)
- $50/mo: Direct Slack/Discord access for autonomous dev questions

**Revenue potential:** $5-20k/year from sponsors (grows with visibility).

### Path 3: Premium Mission Seeds & Templates (HIGH feasibility, LOW revenue initially)

**The core product stays free. Premium content is paid.**

| Product | Price | What it includes |
|---------|-------|-----------------|
| Enterprise mission pack | $49 one-time | 20 production-ready missions (API server, auth system, data pipeline, etc.) with tuned profiles |
| Industry-specific packs | $99 one-time | Healthcare compliance, fintech, e-commerce missions with regulatory awareness |
| Custom mission design | $500 per mission | Hand-crafted mission + acceptance criteria + tuned profile for your specific codebase |

**Why this works:** The kyu/dan difficulty system is already built. Mission design is a genuine skill — writing a good MISSION.md that converges reliably is non-trivial. The value is in the curation, not the code.

**Implementation:** Create a `missions/` directory on the website or a separate repo with gated access. Free missions (8-kyu through 5-kyu) ship with the package. Premium missions (4-kyu through 1-dan) require purchase.

**Revenue potential:** $5-30k/year (scales with user base).

### Path 4: Managed Benchmarking Service (MEDIUM feasibility, MEDIUM revenue)

**"How good is your AI coding agent?"** — A benchmarking service that runs standardised missions against any autonomous coding system and produces a comparable report.

| Offering | Price | What it includes |
|---------|-------|-----------------|
| Single benchmark run | $99 | Run 6 standard missions, produce BENCHMARK_REPORT with convergence metrics |
| Benchmark comparison (2 systems) | $249 | Side-by-side: intentïon vs Copilot Coding Agent vs custom agent |
| Monthly benchmark subscription | $199/mo | Automated monthly benchmarks tracking regression/improvement |
| Enterprise benchmark suite | $999 | Custom missions based on your codebase, regression testing your AI tooling |

**Why this works:** The benchmarking infrastructure already exists (ITERATION_BENCHMARKS_SIMPLE/ADVANCED, BENCHMARK_REPORT templates). The kyu system provides a standardised difficulty scale. No competitor offers reproducible, open-source AI coding benchmarks.

**Unique angle:** "We benchmark AI coding agents the way we benchmark developers — with standardised coding challenges at graduated difficulty levels."

**Revenue potential:** $20-60k/year from teams evaluating AI coding tools.

### Path 5: Enterprise Support & SLA (LOW feasibility short-term, HIGH revenue long-term)

**Once intentïon has production users**, offer professional support.

| Tier | Price | Includes |
|------|-------|---------|
| Community | Free | GitHub issues, public discussions |
| Professional | $299/mo per org | 24h response SLA, private Slack, priority bug fixes |
| Enterprise | $999/mo per org | 4h response SLA, dedicated support engineer, custom integrations, compliance audit trail |

**Revenue potential:** $50-200k/year (requires significant user base first).

---

## What NOT to Do

1. **Don't build a SaaS backend.** It kills the differentiator ("just GitHub"), adds infrastructure costs, and creates security concerns. All state commits to the repo — that's the feature.

2. **Don't gate core features behind a paywall.** GPL prevents proprietary forks anyway, and open-source credibility is the strongest competitive advantage.

3. **Don't chase VC funding.** Zero burn rate means no pressure to raise. Bootstrapping preserves control and aligns incentives with users rather than investors.

4. **Don't compete on model quality.** Users bring their own Copilot subscription. Compete on orchestration, planning, and convergence — not inference.

---

## Recommended Execution Order

**Month 1 (Visibility):**
- Publish GitHub Marketplace listing
- Record 3-minute demo screencast
- Show HN post + blog post
- Set up GitHub Sponsors tiers

**Month 2 (Consulting foundation):**
- Run 3 live benchmarks, publish reports publicly
- Write "autonomous dev setup" consulting offering on Polycode website
- Approach 2-3 Equal Experts clients for pilot workshops

**Month 3 (Premium content):**
- Create 5 premium mission packs (enterprise patterns)
- Launch benchmarking service (manual, then automate)
- Submit GitHub Universe talk proposal

**Months 4-6 (Scale what works):**
- Double down on whichever path gets traction
- If consulting: hire/subcontract delivery capacity
- If marketplace: build community, attract contributors
- If benchmarking: automate the pipeline, add more agent systems

---

## Revenue Forecast (Conservative)

| Quarter | Consulting | Sponsors | Missions | Benchmarks | Total |
|---------|-----------|----------|----------|------------|-------|
| Q2 2026 | $5k | $0.5k | $1k | $0 | $6.5k |
| Q3 2026 | $15k | $2k | $3k | $5k | $25k |
| Q4 2026 | $25k | $4k | $5k | $10k | $44k |
| Q1 2027 | $35k | $6k | $8k | $15k | $64k |
| **Year 1** | **$80k** | **$12.5k** | **$17k** | **$30k** | **~$140k** |

These are GBP-equivalent figures assuming UK-based consulting rates and international digital product sales.
