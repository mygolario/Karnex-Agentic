# Karnex — MVP Scope (90-Day Plan)

> **Exact scope for the Minimum Viable Product.** Every feature, agent, and milestone for the first 90 days.

---

## MVP Success Criteria

The MVP is **done** when ALL of these criteria are met:

| # | Criterion | Measurable Target |
|---|-----------|-------------------|
| 1 | Core agents deployed | 8 agents operational: Pain-to-Product, Idea Crystallizer, ICP Definer, 90-Day War Room, Sprint Planner, Builder Agent, Research Agent, Outreach Agent |
| 2 | Daily Standup + Momentum | Daily Standup agent running, Momentum Score calculating and displaying |
| 3 | Full user journey works | A founder can go from signup → describe pain → get product brief → get roadmap → trigger Builder Agent → see code output |
| 4 | Payments live | Stripe [v2 - deferred] integration active. Founders can subscribe to Starter ($29/mo) or Builder ($79/mo) |
| 5 | First paying customer | At least 1 founder has paid for a subscription and completed a full agent workflow |
| 6 | Agent task metering | Agent task credits are counted and deducted per billing cycle |
| 7 | Auth & security | Supabase Auth working, RLS enforced on all tables, JWT validation on agent service |
| 8 | Beta cohort | 20+ founders have used the platform (free trial or paid) |
| 9 | Monitoring live | PostHog analytics tracking key events, error monitoring active, agent execution logging operational |
| 10 | Documentation | All `.karnex/` docs complete, README accurate, onboarding guide exists |

---

## Phase Breakdown

### Phase 1: Foundation + Dream Engine (Days 1–30)

**Goal:** A founder can sign up, describe their pain, and receive a validated product concept with a 90-day roadmap.

#### Week 1–2: Infrastructure & Auth
| Deliverable | Details |
|-------------|---------|
| Project scaffolding | Next.js 14 app with App Router, Tailwind, shadcn/ui, TypeScript strict mode |
| Supabase setup | Project created, `founders`, `startups`, `ideas`, `agent_runs` tables, RLS policies |
| Auth flow | Signup (email + Google OAuth), login, logout, session management, protected routes |
| Agent service scaffold | FastAPI project with health check, JWT validation middleware, agent execution framework |
| CI/CD | GitHub Actions: lint, type-check, test on PR. Vercel preview deploys. Railway staging deploy |
| Landing page | Marketing landing page with waitlist signup (Resend for emails) |

#### Week 3: Dream Engine Agents
| Deliverable | Details |
|-------------|---------|
| Pain-to-Product Transformer | Fully functional agent: input pain → output 3 product hypotheses with scores |
| Idea Crystallizer | Takes a selected hypothesis → outputs complete product brief (name, tagline, features, pricing) |
| ICP Definer | Takes product brief → outputs ICP document with 3 persona cards |
| Agent execution UI | Agent Hub page: trigger agent, see status (idle/running/complete/error), view output |
| Karnex Memory (v1) | Simple key-value memory store in Supabase. Agents read/write context per founder |

#### Week 4: The Architect Agents
| Deliverable | Details |
|-------------|---------|
| 90-Day War Room | Takes product brief + founder capacity → outputs 3-phase roadmap with milestones |
| Sprint Planner | Takes current phase → outputs weekly sprint with prioritized tasks |
| War Room UI | War Room page: view roadmap, current phase, milestone progress |
| Dashboard (v1) | Main dashboard: current sprint tasks, recent agent outputs, momentum indicator |
| Competitive Landscape Agent | Basic version: takes product category → outputs competitor matrix |

**Phase 1 Exit Criteria:**
- [ ] Founder can complete: Signup → Pain description → Product brief → ICP → Roadmap → Sprint 1
- [ ] 5 internal testers have completed the full flow
- [ ] All Phase 1 agents have > 90% success rate
- [ ] Response time < 15s for Dream Engine agents, < 10s for Architect agents

---

### Phase 2: Executor Pack (Days 31–60)

**Goal:** Founders can trigger execution agents that produce real deliverables: code, research, outreach campaigns.

#### Week 5–6: Builder Agent + Research Agent
| Deliverable | Details |
|-------------|---------|
| Builder Agent (v1) | Generates: landing page (HTML/CSS/JS or Next.js), basic auth scaffolding (Supabase), Stripe [v2 - deferred] payment integration skeleton |
| Builder Agent GitHub integration | Pushes generated code to founder's GitHub repo (requires OAuth + founder approval) |
| Research Agent | Deep research on markets, competitors, technologies. Outputs structured research briefs with citations |
| Agent chaining (v1) | Sequential chain: Research → Idea refinement. LangGraph state machine with handoff protocol |
| Code output viewer | UI component to display generated code with syntax highlighting, file tree, and copy/download |

#### Week 7–8: Outreach Agent + Polish
| Deliverable | Details |
|-------------|---------|
| Outreach Agent | Compose email/LinkedIn outreach sequences. Personalized per contact. Founder approval required before send |
| Gmail API integration | OAuth flow, email sending, tracking (opens, replies via webhooks) |
| Outreach campaign UI | Campaign creation, contact list management, message preview, approval flow, status tracking |
| Agent task metering (v1) | Count agent executions per founder. Display usage on billing page |
| Onboarding flow | Guided first-time experience: welcome → describe pain → pick flow → first agent run |
| `outreach_campaigns` + `outreach_contacts` tables | Full schema with RLS |

**Phase 2 Exit Criteria:**
- [ ] Builder Agent generates a functional landing page from a product brief in < 60 seconds
- [ ] Research Agent produces a research brief with 5+ cited sources
- [ ] Outreach Agent composes a 3-email sequence with personalization
- [ ] Gmail OAuth flow works end-to-end
- [ ] 10 beta founders have used at least one Executor agent
- [ ] Agent chaining works for Research → Builder flow

---

### Phase 3: Coaching + Launch (Days 61–90)

**Goal:** Add the coaching layer, Stripe [v2 - deferred] billing, analytics, and launch publicly.

#### Week 9–10: Compass Layer + Billing
| Deliverable | Details |
|-------------|---------|
| Daily Standup Agent | 3-minute daily check-in: yesterday, today, blockers. Runs via scheduled trigger or founder-initiated |
| Momentum Score | Real-time score (0–100) based on task completion, streak, agent usage. Displayed on dashboard |
| Stripe [v2 - deferred] integration | Full billing: subscription creation, plan management, webhook processing, invoice display |
| Pricing page | Public pricing page with tier comparison. Checkout flow with Stripe [v2 - deferred] Elements |
| Subscription gating | Feature gates enforced: Starter tier has access to Dream Engine + Architect + Builder + Research only |
| `subscriptions` table | Stripe [v2 - deferred] sync, webhook-driven state management |

#### Week 11–12: Analytics + Public Launch
| Deliverable | Details |
|-------------|---------|
| Analytics Agent (v1) | Analyze founder's product metrics (if PostHog connected) or Karnex usage metrics. Produce weekly insight summary |
| PostHog integration | Event tracking for all key user actions. Funnels: signup → first agent → paid conversion |
| Weekly Debrief Agent | Weekly summary: tasks completed, metrics moved, decisions made, next week's focus |
| Error handling polish | All agent error states have user-friendly messages, retry buttons, and fallback suggestions |
| Performance optimization | Agent response time optimization, database query optimization, lazy loading |
| Public launch | Product Hunt launch, Indie Hackers post, Twitter/X announcement, launch email to waitlist |
| Documentation | User-facing docs: getting started guide, agent descriptions, FAQ |

**Phase 3 Exit Criteria:**
- [ ] Daily Standup completes in < 90 seconds
- [ ] Momentum Score updates in real-time on dashboard
- [ ] Stripe [v2 - deferred] subscription flow: signup → trial → paid → manage → cancel all work
- [ ] At least 1 founder has paid for a subscription
- [ ] PostHog tracks: signup, agent_triggered, agent_completed, subscription_created
- [ ] Public launch completed on at least 2 channels

---

## Feature Inclusion / Exclusion Decisions

| Feature | Decision | Rationale |
|---------|----------|-----------|
| Pain-to-Product Transformer | ✅ Include | Core value prop — the entry point for every founder |
| Idea Crystallizer | ✅ Include | Completes the Dream Engine loop — pain → product brief |
| ICP Definer | ✅ Include | Essential for directing Outreach and Content agents |
| Competitive Landscape Agent | ✅ Include (basic) | Important for positioning, but v1 is web-search-based only |
| Trend Radar Agent | ❌ Exclude | Nice-to-have for v1. Requires continuous monitoring infrastructure |
| 90-Day War Room | ✅ Include | Core planning agent — gives founders structure |
| Sprint Planner | ✅ Include | Breaks roadmap into actionable weeks — critical for momentum |
| Decision Journal | ❌ Exclude | Important but not blocking. Manual note-taking suffices for MVP |
| Milestone Tracker | ❌ Exclude | Sprint Planner covers basic tracking. Full milestone tracking is v2 |
| Risk Radar | ❌ Exclude | Requires multiple data sources. Mirror Agent partially covers this |
| Builder Agent | ✅ Include | Flagship execution agent — demonstrates Karnex's "we do the work" value |
| Research Agent | ✅ Include | Foundational — many other agents depend on research capability |
| Outreach Agent | ✅ Include | Directly drives revenue for founders — high perceived value |
| Content & SEO Agent | ❌ Exclude | Valuable but not critical path to first paying customer |
| Sales Agent | ❌ Exclude | Founders do sales manually at this stage |
| Design Agent | ❌ Exclude | Builder Agent handles basic UI. Full design system is v2 |
| Financial Modeling Agent | ❌ Exclude | Founders use spreadsheets at this stage |
| Legal & Compliance Agent | ❌ Exclude | Low urgency for early-stage. Templates available online |
| Fundraising Agent | ❌ Exclude | Target users are bootstrapping, not fundraising |
| Analytics & Insight Agent | ✅ Include (basic) | Needed for founder metrics + proves Karnex tracks outcomes |
| Daily Standup | ✅ Include | Core coaching touchpoint — drives daily engagement and retention |
| Weekly Debrief | ✅ Include (basic) | Weekly reflection drives learning and plan adjustment |
| Momentum Score | ✅ Include | Visual progress indicator — key for retention and motivation |
| Accountability Mode | ❌ Exclude | Complex notification logic. Daily Standup covers the basics |
| Mirror Agent | ❌ Exclude | High prompt complexity. Defer to v2 |
| Founder Knowledge Graph | ❌ Exclude | Karnex Memory (v1 key-value) is sufficient for MVP |
| Mentor Library | ❌ Exclude | Can be simulated with good prompts in other agents |
| Multi-project support | ❌ Exclude | MVP is single-project per founder |
| Team seats | ❌ Exclude | MVP is solo founder only |
| White-label | ❌ Exclude | Enterprise feature — v3 at earliest |
| LinkedIn API integration | ❌ Exclude | API access is restricted. Gmail-only for MVP outreach |
| Notion/Airtable integration | ❌ Exclude | Nice-to-have. Direct Karnex UI is sufficient for MVP |
| Cal.com integration | ❌ Exclude | Not needed until Sales Agent is built |
| Agent chaining (advanced) | ❌ Exclude | Simple sequential chains only. Parallel fan-out and conditional branching are v2 |
| Founder Vault (encrypted) | ❌ Exclude | Standard Supabase storage with RLS is sufficient for MVP |
| Mobile-responsive UI | ✅ Include (basic) | Responsive layout, but no dedicated mobile experience |

---

## The 3 Agents to Build First (and Why)

### 1. Pain-to-Product Transformer

**Why first:** This is the entry point for every founder. The first 5 minutes of Karnex must deliver an "aha" moment — "this thing actually understands my pain and turned it into something real." If this agent doesn't wow, nothing else matters.

**What it proves:** That Karnex can take unstructured human frustration and output structured, actionable product concepts. This is the "magic moment" that drives word-of-mouth.

**Dependencies:** None. It's the root of the agent graph.

**Build time estimate:** 3–4 days (prompt engineering + tools + UI)

### 2. 90-Day War Room

**Why second:** After a founder has a product concept, the immediate next question is "What do I do now?" The War Room answers this with a complete, phased roadmap. Without it, the founder is excited but directionless.

**What it proves:** That Karnex doesn't just generate ideas — it creates actionable plans adapted to the founder's constraints (time, skill, budget).

**Dependencies:** Product brief from Pain-to-Product + Idea Crystallizer.

**Build time estimate:** 4–5 days (complex prompt + plan generation logic + UI)

### 3. Builder Agent

**Why third:** This is the "holy shit" agent. When a founder sees Karnex generate actual code — a real landing page with their product name, their value proposition, their pricing — they're converted. This is the agent that makes Karnex undeniably different from chatbots.

**What it proves:** That Karnex agents execute, not just advise. Real artifacts. Real deployment.

**Dependencies:** Product brief, roadmap context.

**Build time estimate:** 7–10 days (code generation + GitHub integration + deploy pipeline + testing)

---

## Technical MVP Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FOUNDER'S BROWSER                            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Next.js 14 Frontend (Vercel)                      │  │
│  │                                                                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │
│  │  │ Dashboard│ │Idea Studio│ │ War Room │ │   Agent Hub      │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │  │
│  │                                                                │  │
│  │  ┌───────────────────────────────────────────────────────────┐ │  │
│  │  │  Supabase Client (Auth + Realtime subscriptions)         │ │  │
│  │  └───────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes (BFF)                          │
│                                                                      │
│  /api/agents/[id]/run      → Proxy to Agent Service                 │
│  /api/agents/runs/[runId]  → Poll agent status                      │
# [v2 - deferred] Stripe - not in v1
│  /api/webhooks/stripe [v2 - deferred]      → Stripe [v2 - deferred] webhook handler                 │
│  /api/auth/callback        → Supabase Auth callback                 │
│                                                                      │
│  Auth Middleware: Validate Supabase JWT on every request             │
└───────────┬───────────────────────────────────────┬──────────────────┘
            │ HTTPS (internal)                      │ Direct
            ▼                                       ▼
┌───────────────────────────┐       ┌──────────────────────────────────┐
│  FastAPI Agent Service    │       │         Supabase                  │
│  (Railway)                │       │                                  │
│                           │       │  ┌────────────┐ ┌─────────────┐ │
│  POST /v1/agents/:id/exec│◄──────┤  │ PostgreSQL │ │    Auth     │ │
│  GET  /v1/agents/status   │       │  │ (+ RLS)    │ │  (JWT/GoTrue)│ │
│  GET  /v1/health          │       │  └────────────┘ └─────────────┘ │
│                           │       │  ┌────────────┐ ┌─────────────┐ │
│  ┌─────────────────────┐  │       │  │  Realtime  │ │   Storage   │ │
│  │   LangGraph Engine  │  │       │  │ (WebSocket)│ │  (S3-compat)│ │
│  │                     │  │       │  └────────────┘ └─────────────┘ │
│  │  Agent 1 ──► Agent 2│  │       └──────────────────────────────────┘
│  │      │              │  │                   ▲
│  │      ▼              │  │                   │ SQL queries
│  │  Agent 3            │  │───────────────────┘
│  └─────────────────────┘  │
│                           │
│  ┌─────────────────────┐  │       ┌──────────────────────────────────┐
│  │  Google Gemini API  │◄─┤       │      External Services           │
│  │  (LLM calls)        │  │       │                                  │
# [v2 - deferred] Stripe - not in v1
│  └─────────────────────┘  │       │  Stripe [v2 - deferred] ─── Payments & Billing   │
│                           │       │  Resend ─── Transactional Email  │
│  ┌─────────────────────┐  │       │  GitHub ─── Code Push            │
│  │  Karnex Memory      │  │       │  Gmail  ─── Outreach Sending     │
│  │  (Supabase table)   │  │       │  PostHog ── Product Analytics    │
│  └─────────────────────┘  │       └──────────────────────────────────┘
└───────────────────────────┘
```

### Data Flow for Agent Execution (MVP)

```
1. Founder clicks "Run Agent" in UI
2. Frontend → POST /api/agents/{agent-id}/run (with input payload)
3. Next.js API route validates JWT, checks subscription tier, deducts credit
4. API route → POST /v1/agents/{agent-id}/execute (to FastAPI on Railway)
5. FastAPI loads LangGraph agent, injects Karnex Memory context
6. Agent calls Google Gemini API with system prompt + tools + input
7. Agent executes tools (web search, code generation, etc.)
8. Agent writes output to Supabase (agent_runs + agent_outputs tables)
9. Supabase Realtime pushes update to frontend via WebSocket
10. Frontend updates UI: running → complete, displays output
```

---

## Definition of "First Paying Customer" Milestone

A "first paying customer" is achieved when ALL of the following are true:

1. **Real person, not a test account.** A founder who signed up organically (not a team member or friend doing a favor).
2. **Completed at least one full agent workflow.** They used Dream Engine → Architect → at least one Executor agent.
3. **Entered real payment information.** A valid credit card processed through Stripe [v2 - deferred].
4. **Paid for the first billing cycle.** The first invoice has been paid (not just a trial signup).
5. **Still active after 7 days.** They logged in at least once in the 7 days after payment.
6. **Provided organic feedback.** They mentioned a positive outcome ("this saved me time", "I shipped my landing page", "I found my first leads").

**This milestone triggers:**
- Internal celebration 🎉
- Case study interview request (with permission)
- Referral program activation
- Press release / social media announcement

---

## Explicitly Deferred to v2

| Feature | Deferred Rationale | v2 Timeline Estimate |
|---------|-------------------|---------------------|
| **Trend Radar Agent** | Requires continuous monitoring pipeline, news aggregation, and signal scoring infrastructure. Valuable but not critical for initial founder workflows | v2 Month 1 |
| **Decision Journal Agent** | Important for learning loops but founders can manually log decisions. Sprint Planner covers basic tracking | v2 Month 1 |
| **Milestone Tracker Agent** | Sprint Planner + War Room provide basic progress tracking. Full milestone automation is a polish feature | v2 Month 1 |
| **Risk Radar Agent** | Requires multiple data feeds (market, financial, behavioral). High complexity, lower urgency at MVP stage | v2 Month 2 |
| **Content & SEO Agent** | High value but not on critical path to first paying customer. Founders can use existing tools (ChatGPT, Jasper) temporarily | v2 Month 1 |
| **Sales Agent** | Solo founders handle early sales manually. Useful once they have > 10 prospects | v2 Month 2 |
| **Design Agent** | Builder Agent includes basic UI generation. Full design system and brand generation is v2 | v2 Month 2 |
| **Financial Modeling Agent** | Founders use spreadsheets at this stage. Becomes critical when Fundraising Agent is built | v2 Month 2 |
| **Legal & Compliance Agent** | Low urgency for early-stage SaaS. Standard templates available online. High liability risk if done poorly | v2 Month 3 |
| **Fundraising Agent** | Target users are bootstrapping. Fundraising is a later-stage need | v2 Month 3 |
| **Mirror Agent** | Complex prompt engineering for effective assumption challenging. Partially covered by good prompt design in other agents | v2 Month 1 |
| **Accountability Mode** | Requires notification infrastructure (push, email, SMS). Daily Standup covers basic engagement | v2 Month 2 |
| **Founder Knowledge Graph** | Karnex Memory v1 (key-value) is sufficient. Graph-based memory with entity extraction is v2 | v2 Month 2 |
| **Mentor Library** | Good prompt design in coaching agents simulates this. Curated mentor content library is a content investment | v2 Month 3 |
| **LinkedIn API integration** | LinkedIn's API is restrictive and requires partner program approval. Gmail-only outreach for MVP | v2 Month 2 (if API access secured) |
| **Notion/Airtable integrations** | Nice-to-have data import/export. Not critical when Karnex has its own UI | v2 Month 2 |
| **Cal.com integration** | Useful with Sales Agent for scheduling demos. Not needed until Sales Agent is built | v2 Month 2 |
| **Advanced agent chaining** | Parallel fan-out, conditional branching, and feedback loops. MVP uses simple sequential chains only | v2 Month 1 |
| **Multi-project support** | MVP is one project per founder. Multi-project requires significant data model and UI changes | v2 Month 3 |
| **Team seats** | Solo founder product. Team features are Studio tier, which is post-launch | v2 Month 3+ |
| **White-label** | Enterprise feature. Not relevant for initial market | v3 |
| **Founder Vault (encrypted)** | Standard Supabase storage with RLS is sufficient. Client-side encryption vault is v2 | v2 Month 2 |
| **Mobile app** | Responsive web is sufficient. Native mobile is a major investment for low initial ROI | v3 |
| **Self-hosted / on-prem** | Not aligned with target market (solo founders). Enterprise feature if ever | Not planned |

---

*Last updated: 2026-05-28 | Version: 1.0.0*
