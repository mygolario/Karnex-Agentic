# Karnex

**The AI co-founder for solo founders.** Karnex is a multi-agent AI platform that turns raw ideas into launched products with real revenue — by deploying specialized agents that execute every function of a founding team.

Karnex is not a chatbot. It's not a productivity tool. It's a co-founder that shows up every day, does the work, and never quits. From idea validation to code generation, outreach campaigns to financial modeling, daily standups to weekly debriefs — Karnex collapses the execution gap that kills 95% of solo founder projects.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         KARNEX                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Layer 5: PLATFORM                                     │  │
│  │  Karnex Memory · Agent Orchestration · Integrations    │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  Layer 4: THE COMPASS (Coaching & Accountability)      │  │
│  │  Daily Standup · Weekly Debrief · Momentum Score       │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  Layer 3: EXECUTOR PACK (Agents That Ship)             │  │
│  │  Builder · Research · Outreach · Content · Analytics   │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  Layer 2: THE ARCHITECT (Roadmap & Strategy)           │  │
│  │  90-Day War Room · Sprint Planner · Decision Journal   │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  Layer 1: DREAM ENGINE (Idea Intelligence)             │  │
│  │  Pain-to-Product · Idea Crystallizer · ICP Definer     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Frontend: Next.js 14 (Vercel)                              │
│  Agent Service: Python FastAPI (Railway)                     │
│  Database: Supabase (PostgreSQL + Auth + Realtime)           │
│  AI: Google Gemini + LangGraph                               │
│  Payments: Stripe                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose (for local Supabase)
- Supabase CLI (`npm install -g supabase`)
- Stripe CLI (for webhook testing)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/karnex.git
cd karnex

# Install frontend dependencies
cd apps/web
npm install
cd ../..

# Install agent service dependencies
cd services
pip install -r requirements.txt
cd ..
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Fill in required variables:
# - NEXT_PUBLIC_SUPABASE_URL (from Supabase project or local CLI)
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - GOOGLE_GEMINI_API_KEY
# - STRIPE_SECRET_KEY (test mode)
# - STRIPE_WEBHOOK_SECRET
# - RESEND_API_KEY
```

### 3. Start Local Services

```bash
# Start local Supabase (database, auth, realtime, storage)
supabase start

# Apply database migrations
supabase db reset

# Start the agent service (Python FastAPI)
cd services
uvicorn api.main:app --reload --port 8000
cd ..

# Start the frontend (Next.js)
cd apps/web
npm run dev
```

### 4. Access

- **Frontend:** http://localhost:3000
- **Agent Service:** http://localhost:8000
- **Supabase Studio:** http://localhost:54323
- **API Docs (FastAPI):** http://localhost:8000/docs

---

## Folder Structure

```
karnex/
├── .karnex/              # 📖 Project documentation (architecture, rules, specs)
├── apps/web/             # 🖥️  Next.js 14 frontend application
│   ├── src/app/          #     App Router pages
│   ├── src/components/   #     React components (shadcn/ui based)
│   ├── src/hooks/        #     Custom React hooks
│   ├── src/lib/          #     Utility libraries
│   └── src/types/        #     TypeScript type definitions
├── services/             # 🤖 Python agent microservices
│   ├── agents/           #     Individual agent implementations
│   ├── shared/           #     Shared utilities (memory, config, logging)
│   └── api/              #     FastAPI application
├── supabase/             # 🗄️  Database migrations & seeds
│   └── migrations/       #     SQL migration files
├── scripts/              # 🔧 Development & deployment scripts
└── packages/             # 📦 Shared packages (types)
```

---

## Key Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev (frontend) | `cd apps/web && npm run dev` | Start Next.js dev server |
| Dev (agents) | `cd services && uvicorn api.main:app --reload` | Start FastAPI dev server |
| Build | `cd apps/web && npm run build` | Production build |
| Test (frontend) | `cd apps/web && npm test` | Run Vitest tests |
| Test (agents) | `cd services && pytest` | Run Python tests |
| Lint | `cd apps/web && npm run lint` | ESLint + TypeScript check |
| DB Reset | `supabase db reset` | Reset local database |
| DB Migrate | `supabase migration up` | Apply new migrations |
| Generate Types | `supabase gen types typescript --local > apps/web/src/types/database.ts` | Generate TS types from DB |
| Stripe Webhooks | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` | Forward Stripe webhooks locally |

---

## Documentation

All project documentation lives in the `.karnex/` directory:

| Document | Description |
|----------|-------------|
| [projectcontext.md](.karnex/projectcontext.md) | Single source of truth — what Karnex is, architecture, agents, personas |
| [agentrules.md](.karnex/agentrules.md) | Agent behavior governance — identity, communication, safety, escalation |
| [projectrules.md](.karnex/projectrules.md) | Codebase rules — folder structure, naming, Git workflow, testing |
| [mvp_scope.md](.karnex/mvp_scope.md) | 90-day MVP scope — phases, deliverables, success criteria |
| [techstack.md](.karnex/techstack.md) | Technical architecture — stack, services, auth, deployment |
| [datamodels.md](.karnex/datamodels.md) | Database schema — all tables, RLS policies, key queries |
| [agentregistry.md](.karnex/agentregistry.md) | Agent registry — specs for all 27 agents |
| [promptlibrary.md](.karnex/promptlibrary.md) | LLM prompts — production system prompts for all agents |
| [uxflows.md](.karnex/uxflows.md) | UX flows — onboarding, standups, agent execution, screens |
| [integrations.md](.karnex/integrations.md) | Integration specs — auth, endpoints, rate limits for all services |
| [monetization.md](.karnex/monetization.md) | Pricing & billing — tiers, Stripe config, metering, churn |
| [securityrules.md](.karnex/securityrules.md) | Security architecture — auth, RLS, GDPR, incident response |
| [founderjourney.md](.karnex/founderjourney.md) | Founder narrative — Day 1 to Day 90, emotional arc, key touchpoints |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python FastAPI, LangChain, LangGraph |
| Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| AI | Google Gemini API (2.0 Flash + 2.5 Pro) |
| Payments | Stripe (subscriptions + metering) |
| Email | Resend (transactional), Gmail API (outreach) |
| Analytics | PostHog |
| Deployment | Vercel (frontend), Railway (agent services) |

---

## Contributing

### Branch Workflow

1. Create a branch: `feature/KX-{ticket}-{description}`
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `feat(web): add agent status component`
3. Open a PR against `develop`
4. Ensure all CI checks pass (lint, type-check, tests)
5. Get at least 1 review approval
6. Squash merge to `develop`

### Adding a New Agent

1. Create directory: `services/agents/{agent_slug}/`
2. Implement: `agent.py`, `prompts.py`, `tools.py`, `schemas.py`, `tests/`
3. Register route in `services/api/routes/agents.py`
4. Update `.karnex/agentregistry.md` with full spec
5. Add system prompt to `.karnex/promptlibrary.md`
6. Add database migration if needed

### Code Standards

- TypeScript strict mode, no `any`, named exports
- Python type hints on all functions, Pydantic v2 models, ruff for formatting
- Tests required: component render tests, API validation, agent schema, prompt behavior

See [projectrules.md](.karnex/projectrules.md) for complete coding standards.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built for the solo founders who refuse to quit.</strong>
</p>
