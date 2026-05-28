# PLAN_LAUNCH.md — Launch Strategy for intentïon agentic-lib

## Market Position

intentïon occupies a unique position at the intersection of three converging trends: autonomous coding agents going mainstream, agentic AI reshaping engineering workflows, and recursive self-improvement moving from theory to practice.

### Where the industry is (March 2026)

AI coding agents have moved from research demos to production tools. [Agentic coding in 2026](https://www.timesofai.com/industry-insights/agentic-coding-in-software-development/) is predicted to move toward fully automated software engineering environments operating without much human supervision throughout an entire product life cycle. [PwC's Agentic SDLC report](https://www.pwc.com/m1/en/publications/2026/docs/future-of-solutions-dev-and-delivery-in-the-rise-of-gen-ai.pdf) envisions AI as a first-pass executor across the SDLC, compressing weeks of coordination into continuous workflows.

Meanwhile, recursive self-improvement is the hottest open problem in AI. The [ICLR 2026 Workshop on AI with Recursive Self-Improvement](https://recursive-workshop.github.io/) notes that "loops that rewrite prompts, weights, or hypotheses already operate inside foundation-model pipelines and embodied agents, yet their behavior remains poorly characterized, and evaluation, safety, and governance tools lag behind algorithmic progress." [Apart Research](https://apartresearch.com/project/the-hidden-threat-of-recursive-selfimproving-llms-x5f0) has flagged this as an active safety concern.

### Where intentïon fits

No existing product combines all three: a continuous autonomous development loop, a formal planning theory, and self-hosting capability. intentïon is building at the convergence.

| Capability | intentïon | [Copilot Coding Agent](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent) | [Devin 2.0](https://venturebeat.com/programming-development/devin-2-0-is-here-cognition-slashes-price-of-ai-software-engineer-to-20-per-month-from-500) | [Cursor](https://www.cursor.com/) / Claude Code |
|---|---|---|---|---|
| Continuous autonomous loop | Yes — intentïon → features → issues → code → merge → repeat | No — single task per assignment | No — single session | No — human in loop |
| Persistent planning artifact | Yes — partial-order plan committed to repo, refined each cycle | No | No — ephemeral scratchpad | No |
| Self-hosting (manages own codebase) | Planned — PLAN_SELF_HOSTED.md | No | No | No |
| Supervisor orchestrating multiple agents | Yes — LLM-driven supervisor dispatches 5+ workflows | No | No | No |
| GitHub-native (no external services) | Yes — Actions + Copilot SDK only | Yes | No — external SaaS | No — local/cloud |
| Distributable as template | Yes — `npm init` into any repo | No | No | No |
| Formal planning theory | Yes — NONLIN/UCPOP-derived partial-order planning | No | No | No |
| Price | Free (OSS) + Copilot subscription | Free with Copilot | [$20/mo+](https://devin.ai/pricing/) | $20-40/mo |

### Three tiers of differentiation

**Tier 1 — What works today (MVP):** A continuous autonomous loop running on GitHub infrastructure. 27 features, all implemented. Nine task handlers, supervisor orchestration, TDD mode, discussions bot, TOML configuration, intentïon-driven development. This alone is distinctive — no competitor has the continuous loop.

**Tier 2 — Self-hosting (PLAN_SELF_HOSTED.md):** The system can manage its own codebase. Bootstrap tests prove the SDK can clone itself and make useful increments, and an empty repo can converge toward a known target version. This is a practical demonstration of recursive self-improvement — a topic the [ICLR 2026 RSI workshop](https://iclr.cc/virtual/2026/workshop/10000796) and [Manifold prediction markets](https://manifold.markets/MaxHarms/will-ai-be-recursively-self-improvi) are actively debating.

**Tier 3 — The conceptual model (CONCEPT.md):** Partial-order planning with causal links, threat detection, truth maintenance, event calculus, and belief revision. Agents and capabilities — composable building blocks for agent assembly. The 7-step transformation engine: assess, plan, solve, assemble, execute, witness, iterate. This draws on classical AI planning theory (Tate's NONLIN, Penberthy & Weld's UCPOP, Steel & Ho's planning-execution integration) applied to software engineering for the first time.

---

## What We've Built

An autonomous coding system that lives entirely inside a GitHub repository. Install it, write an INTENTÏON.md, and the repository evolves itself — generating issues, writing code, running tests, opening PRs, maintaining documentation, and engaging with users through GitHub Discussions.

The system has no external dependencies beyond GitHub. It runs as GitHub Actions workflows on configurable schedules, uses the GitHub Copilot SDK for decision-making, and is distributed as a single npm package.

---

## Three Audiences, Three Stories

### For developers (the loop)

> `npx @xn-intenton-z2a/agentic-lib init` — then write your intentïon. Nine task handlers run as GitHub Actions workflows. No external services. No API keys beyond GitHub. TOML-configurable. MIT-licensed distributed code.

**What they care about:** Does it work? Can I try it in 10 minutes? What happens when it breaks?

**Launch asset:** The demo. A 3-minute screencast showing intentïon → autonomous evolution → working code. The "walk away, come back to merged PRs" proof.

### For researchers (the theory)

> intentïon applies classical AI partial-order planning (NONLIN, UCPOP) to autonomous software development — with committed planning artifacts, causal links, truth maintenance, and budget-constrained decision tree search. Self-hosting bootstrap tests provide measurable evidence of recursive self-improvement in a practical engineering context.

**What they care about:** Is the theoretical contribution novel? Is it reproducible? Does self-hosting actually work?

**Launch asset:** A technical paper or workshop submission. The bootstrap test results (clone-self convergence scores, empty-bootstrap N→N+1 convergence). Submission to [ICLR 2026 RSI workshop](https://recursive-workshop.github.io/) or a software engineering venue.

### For GitHub / Microsoft (the ecosystem)

> intentïon is the most advanced Copilot SDK integration in the wild. A complete autonomous development lifecycle — supervisor orchestration, multi-agent workflows, discussions bot, template distribution — built entirely on GitHub's own infrastructure. And it's heading toward self-hosting.

**What they care about:** Does this showcase what their platform can do? Is it good for the ecosystem?

**Launch asset:** Marketplace listing for `agentic-step`. A GitHub Universe talk proposal. A blog post framing intentïon as what [GitHub's custom agents](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/) could become.

---

## Launch Plan

### Phase 1: Demonstrate (Weeks 1-2)

**Goal:** Create an irrefutable demo and the self-hosting proof.

- [ ] Record a 3-minute screencast: create repo from template → write INTENTÏON.md → time-lapse the autonomous cycle → show resulting PRs and working code
- [ ] Create 3 demo repositories showing different intentïons:
  - CLI tool (CSV to JSON converter)
  - Library (string utilities package)
  - Web component (markdown renderer)
- [ ] Each demo shows the full lifecycle: issues created, code generated, tests passing, PRs merged, discussions bot responding
- [ ] Run self-hosting bootstrap tests (PLAN_SELF_HOSTED.md Phase 1) and record the results — clone-self and empty-bootstrap convergence scores
- [ ] Write the narrative blog post: "I wrote a sentence and got a working project — then the project started improving itself"

### Phase 2: Publish (Weeks 2-4)

**Goal:** Make it findable across two channels — developer community and research community.

Developer channel:
- [ ] Show HN: "An npm package that makes your GitHub repo evolve itself"
- [ ] Reddit r/programming, r/github, r/artificial
- [ ] Dev.to / Hashnode blog post
- [ ] Twitter/X with demo GIFs
- [ ] Submit to GitHub Marketplace as an Action (agentic-step)
- [ ] List on Product Hunt
- [ ] Ensure npm README matches GitHub README

Research channel:
- [ ] Write a short technical paper: "Self-Hosting Autonomous Development: Partial-Order Planning for Recursive Software Improvement"
- [ ] Frame around: classical AI planning theory + practical GitHub-native implementation + bootstrap test results
- [ ] Target: ICLR 2026 RSI workshop, or ICSE/FSE software engineering venue
- [ ] Publish bootstrap test data (convergence scores, pass rates) as reproducible artifacts

### Phase 3: Engage (Weeks 4-6)

**Goal:** Build community and credibility on both fronts.

- [ ] Respond to every HN/Reddit comment
- [ ] Create "Getting Started in 5 minutes" video
- [ ] Write comparison posts: "intentïon vs GitHub Agentic Workflows" and "intentïon vs Copilot Coding Agent"
- [ ] Reach out to AI/DevOps newsletter authors
- [ ] Submit a talk proposal to GitHub Universe / DevOps Days
- [ ] Open a "Show & Tell" discussion in agentic-lib for early users
- [ ] Engage with ICLR RSI workshop community — discuss self-hosting results, safety implications, convergence metrics

### Phase 4: Iterate and Extend (Ongoing)

**Goal:** Respond to feedback, advance the conceptual model, build the research case.

- [ ] Track which intentïons succeed and which fail — build an intentïon difficulty taxonomy
- [ ] Implement CONCEPT.md Phase 1: persistent planning artifact (committed partial-order plan)
- [ ] Implement convergence scoring across versions (Extension C from PLAN_SELF_HOSTED.md)
- [ ] Add canary self-host check to release.yml (Extension B from PLAN_SELF_HOSTED.md)
- [ ] Add seed templates for more ecosystems (Python, Rust, etc.)
- [ ] Consider a web UI for intentïon editing and real-time dashboard
- [ ] Develop the full 7-step engine loop from CONCEPT.md

---

## Messaging

### One-liner
> Write an intentïon. Watch it build itself. Let it improve itself.

### Elevator pitch
> intentïon is an open-source system that turns any GitHub repository into an autonomous, self-evolving codebase. You write an intentïon, and the system generates features, creates issues, writes code, runs tests, merges PRs, and maintains documentation — continuously, on a configurable schedule, using the GitHub Copilot SDK. A supervisor agent orchestrates the pipeline. Users interact through GitHub Discussions. And the system is heading toward self-hosting — managing its own codebase with its own workflows.

### For the research community
> intentïon applies classical AI partial-order planning theory — causal links, threat detection, open conditions, truth maintenance, event calculus — to autonomous software development. Planning artifacts are committed to the repository and refined across cycles, not ephemeral. Self-hosting bootstrap tests provide measurable convergence metrics for recursive self-improvement in a practical engineering context. Built entirely on GitHub Actions and the Copilot SDK, the system is reproducible and inspectable.

### For decision-makers
> An open-source system that turns any GitHub repository into a self-evolving codebase. Reduce the overhead of issue triage, documentation maintenance, and routine code changes. The AI works within your existing GitHub permissions and CI/CD pipeline — no new vendors, no data leaving GitHub. Heading toward self-hosting: the system manages its own development, providing a continuous quality signal.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| GitHub builds a supervisor layer into [Agentic Workflows](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/) | Medium | Our planning theory, self-hosting, and INTENTÏON.md-driven approach remain distinctive. GitHub validates the architecture; we differentiate on depth. |
| Copilot SDK changes or access restrictions | Low-medium | Architecture is model-agnostic. The copilot.js adapter can be swapped. Local LLM backend (PLAN_LOCAL_SCENARIO_TESTS.md) provides a fallback. |
| Early users hit intentïon failures | High | Curate demo repos showing successful intentïons. Provide troubleshooting guides. Track intentïon success/failure rates to improve prompts. |
| Self-hosting tests don't pass reliably with tiny models | High | Local LLM tests prove mechanics, not capability. Add Copilot SDK variant (Extension D) for genuine self-hosting proof. Be transparent about what local tests demonstrate vs what they don't. |
| Research community dismisses it as "just engineering" | Medium | Ground the paper in established planning theory (NONLIN, UCPOP, Steel & Ho). The self-hosting bootstrap test is a concrete, reproducible, novel result. Frame as applied AI planning, not just DevOps tooling. |
| [Devin 2.0](https://devin.ai/pricing/) at $20/mo undercuts on polish | Medium | intentïon is free, open-source, GitHub-native, and heading toward self-hosting. Different value proposition: own your infrastructure vs rent a service. |

---

## Economics

### Cost structure: near-zero

intentïon costs almost nothing to run or distribute:

| Resource | Who pays | Cost to intentïon |
|---|---|---|
| GitHub Actions minutes | User (free for public repos) | $0 |
| GitHub Copilot SDK | User (included with Copilot subscription) | $0 |
| npm publishing | OIDC trusted publishing, no tokens | $0 |
| Hosting | GitHub Pages / repo / Actions | $0 |
| Infrastructure | User's GitHub account | $0 |
| Distribution | `npm install` / `npx init` | $0 |

The user brings their own compute (Actions), their own AI (Copilot), and their own hosting (GitHub). intentïon is pure tooling — it costs nothing to stamp out another copy.

This is a structural advantage over every funded competitor: Devin needs to run inference servers. Cursor needs to host cloud agents. intentïon runs on infrastructure the user already has.

### Why there's no SaaS play

An earlier idea was backend services (persistent "memories", analytics, curated knowledge) offered through the Marketplace action. This doesn't work because:

1. **The LLM handles it locally.** All state lives as committed files in the repo — `intentïon.log`, `features/`, `library/`, the planning artifact. There's nothing a backend service adds that a committed file doesn't.
2. **It kills the differentiator.** "Just GitHub — no external services, your data never leaves" is the strongest competitive claim. A backend service turns intentïon into another vendor.
3. **Costs are zero without it.** There's no infrastructure to pay for, so there's no cost pressure to monetize.

### Strategy: build the machine, then pivot the person

The project is open source (GPL core, MIT distributed) with near-zero costs. There's no burn rate. The goal is not to monetize the software — it's to build the most advanced recursive self-improvement system that exists, and let that create opportunities.

**The thesis:** Classical AI planning theory from the [University of Essex Computer Science department](https://www.essex.ac.uk/departments/computer-science-and-electronic-engineering) in the 1990s (Steel & Ho, partial-order planning, truth maintenance) described concepts that couldn't be executed because the compute wasn't available. 2026 LLM technology provides that compute. intentïon is the implementation — grounded in academically-reviewed theory, built on commodity infrastructure, free to use, and heading toward self-hosting as a practical demonstration of recursive self-improvement.

### The author: Antony Christopher Cartwright

Antony is the sole developer and director of [Polycode Limited](https://polycode.co.uk/) (est. 2016), a UK-registered software consultancy. He holds an MSc in Computer Science from the [University of Essex](https://www.essex.ac.uk/departments/computer-science-and-electronic-engineering) (1991-1997) — the same department where Steel & Ho published the planning-execution theory that underpins CONCEPT.md.

Current position: Associate Consultant at [Equal Experts](https://www.equalexperts.com/), working through Rothwell International BV (Netherlands). The Equal Experts associate model means working alongside peers on enterprise client engagements — Liberty Global, BskyB, Disney, Sky New Zealand, William Hill, Reuters, Leeds Building Society, NHS England among past clients. 25+ years on JVM-based languages, AWS Certified, with recent focus on Kotlin, serverless AWS (CDK/CloudFormation/DynamoDB), and GitHub Actions.

[LinkedIn: antonycc](https://www.linkedin.com/in/antonycc/) | [GitHub: antonycc](https://github.com/antonycc) | [Polycode Limited](https://polycode.co.uk/)

### Primary path: GitHub partnership

Build the most advanced recursive self-improvement system. Make it free, public, and require nothing outside the GitHub repository. intentïon's natural home is GitHub — it showcases what their platform can do better than anything else in the ecosystem. The partnership conversation:

- "Here is a working autonomous development loop running entirely on your infrastructure"
- "Here is self-hosting — the system manages its own codebase using your Copilot SDK"
- "The planning theory is academically grounded and the implementation is open source"
- "What do you want to do with this?"

This is lower probability but highest impact. GitHub Marketplace listing, GitHub Universe talk, GitHub Stars program — all feed this path.

### Secondary path: consulting pivot

If the GitHub conversation doesn't materialise (or takes time), the project enables a pivot in consulting positioning. The current associate model at Equal Experts is peer-to-peer technical delivery — architecture and development for enterprise clients. intentïon repositions the consulting offer:

| Current positioning | Pivot positioning |
|---|---|
| Java/Kotlin/AWS technical architect | AI-driven autonomous development strategist |
| "I build your cloud infrastructure" | "I set up AI systems that build your infrastructure" |
| Equal Experts associate (peer delivery) | Direct consulting (AI transformation) |
| Day-rate technical work | Value-based AI rollout engagements |

The pivot is natural: the same enterprise clients (financial services, telecom, media, healthcare) that need cloud architects today will need autonomous development strategy tomorrow. The [PwC Agentic SDLC report](https://www.pwc.com/m1/en/publications/2026/docs/future-of-solutions-dev-and-delivery-in-the-rise-of-gen-ai.pdf) and [CIO's agentic AI forecast](https://www.cio.com/article/4134741/how-agentic-ai-will-reshape-engineering-workflows-in-2026.html) both describe this shift. Antony's 25 years of enterprise delivery credibility + intentïon as a working demonstration = a differentiated consulting offer.

Consulting engagements could include:
- Autonomous development setup for enterprise repositories
- Intentïon workshops (writing effective INTENTÏON.md for real codebases)
- AI-heavy rollout strategy (how to introduce autonomous development into existing CI/CD)
- Training: "From CI/CD to autonomous development" for engineering teams

The Equal Experts network remains valuable — some engagements may come through EE, others directly. The associate model is compatible with parallel consulting under Polycode Limited.

### Tertiary path: research funding

The Essex connection is genuine academic lineage, not a marketing story. If intentïon produces a publishable self-hosting result, there's a path to:
- Collaboration with Essex CSEE on applied AI planning research
- EPSRC or Innovate UK funding for CONCEPT.md implementation
- Conference talks (ICLR, ICSE, GitHub Universe) that feed both partnership and consulting paths

### What's explicitly NOT the plan

- No managed service (contradicts "just GitHub")
- No freemium tiers (there's nothing to gate — it's all open source)
- No backend services (the LLM handles state locally)
- No subscription pricing (the user already pays GitHub, not us)
- No VC fundraising (near-zero costs, no need for external capital)

---

## References

### Industry & Market
- [Agentic Coding in 2026: AI's Impact on Software Development](https://www.timesofai.com/industry-insights/agentic-coding-in-software-development/)
- [PwC: Agentic SDLC in Practice](https://www.pwc.com/m1/en/publications/2026/docs/future-of-solutions-dev-and-delivery-in-the-rise-of-gen-ai.pdf)
- [How Agentic AI Will Reshape Engineering Workflows in 2026](https://www.cio.com/article/4134741/how-agentic-ai-will-reshape-engineering-workflows-in-2026.html)
- [Agentic Design Patterns: The 2026 Guide](https://www.sitepoint.com/the-definitive-guide-to-agentic-design-patterns-in-2026/)
- [Best AI Coding Agents 2026](https://playcode.io/blog/best-ai-coding-agents-2026)
- [Best AI Coding Agents 2026: Real-World Developer Reviews](https://www.faros.ai/blog/best-ai-coding-agents-2026)
- [AI Coding Agents 2026: Complete Guide](https://www.verdent.ai/guides/ai-coding-agent-2026)

### Competitors
- [GitHub Copilot Coding Agent — About](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)
- [GitHub Copilot Coding Agent — What's New](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/)
- [GitHub Copilot CLI Reaches GA](https://visualstudiomagazine.com/articles/2026/03/02/github-copilot-cli-reaches-general-availability-bringing-agentic-coding-to-the-terminal.aspx)
- [Devin 2.0 Price Drop to $20/mo](https://venturebeat.com/programming-development/devin-2-0-is-here-cognition-slashes-price-of-ai-software-engineer-to-20-per-month-from-500)
- [Devin Pricing](https://devin.ai/pricing/)
- [Devin AI Guide 2026](https://aitoolsdevpro.com/ai-tools/devin-guide/)
- [Cogent: AI-Driven Self-Evolving Software by 2026](https://www.cogentinfo.com/resources/ai-driven-self-evolving-software-the-rise-of-autonomous-codebases-by-2026)

### Research — Recursive Self-Improvement
- [ICLR 2026 Workshop on AI with Recursive Self-Improvement](https://recursive-workshop.github.io/)
- [ICLR 2026 RSI Workshop — Virtual](https://iclr.cc/virtual/2026/workshop/10000796)
- [Apart Research: The Hidden Threat of Recursive Self-Improving LLMs](https://apartresearch.com/project/the-hidden-threat-of-recursive-selfimproving-llms-x5f0)
- [Self-Improving AI Agents: Techniques in RL and Continual Learning](https://www.technology.org/2026/03/02/self-improving-ai-agents-reinforcement-continual-learning/)
- [Will AI Be Recursively Self-Improving by Mid 2026? (Manifold)](https://manifold.markets/MaxHarms/will-ai-be-recursively-self-improvi)
- [On Recursive Self-Improvement — Dean W. Ball](https://www.hyperdimensional.co/p/on-recursive-self-improvement-part)
- [Recursive Self-Improvement by Agentic AI Systems](https://www.odrindia.in/2026/02/17/recursive-self-improvement-by-agentic-ai-systems/)

### Research — AI Agents & Planning
- [MIT Sloan: Agentic AI Explained](https://mitsloan.mit.edu/ideas-made-to-matter/agentic-ai-explained)
- [7 Agentic AI Trends to Watch in 2026](https://machinelearningmastery.com/7-agentic-ai-trends-to-watch-in-2026/)
- [5 Key Trends Shaping Agentic Development in 2026](https://thenewstack.io/5-key-trends-shaping-agentic-development-in-2026/)
- [Taming AI Agents: The Autonomous Workforce of 2026](https://www.cio.com/article/4064998/taming-ai-agents-the-autonomous-workforce-of-2026.html)

### Planning Theory (from CONCEPT.md)
- [NONLIN — Tate, 1977, Edinburgh](https://www.aiai.ed.ac.uk/project/nonlin/)
- [O-Plan — Currie & Tate, 1983-1999, Edinburgh](https://www.sciencedirect.com/science/article/abs/pii/000437029190024E)
- [UCPOP — Penberthy & Weld, 1992](https://www.semanticscholar.org/paper/UCPOP:-A-Sound,-Complete,-Partial-Order-Planner-for-Penberthy-Weld/6e1bd5758be5495141d56de31c28d57f55c56f3e)
- [Planning and Execution using Partial Decision Trees — Steel & Ho, 1993, Essex](https://repository.essex.ac.uk/8658/)
- [Partial-Order Planning — Wikipedia](https://en.wikipedia.org/wiki/Partial-order_planning)

---

## Related Documents

- **[FEATURES.md](../../FEATURES.md)** — All 27 features with status and architecture
- **[CONCEPT.md](../../CONCEPT.md)** — The conceptual model: agents, capabilities, 7-step engine, planning theory
- **[PLAN_SELF_HOSTED.md](PLAN_4_SELF_HOSTED.md)** — Bootstrap test strategy for self-hosting
- **[PLAN_LOCAL_SCENARIO_TESTS.md](_developers/archive/PLAN_1_LOCAL_SCENARIO_TESTS.md)** — Local scenario tests with tiny LLM
- **[FEATURES_ROADMAP.md](FEATURES_ROADMAP.md)** — Post-MVP features (#28+)
