# Karnex Project Rules

> **Codebase governance for all developers and AI agents working on Karnex.**
> These rules ensure consistency, maintainability, and quality across the entire codebase.

---

## 1. Folder Structure

```
karnex/
├── .karnex/                        # Project documentation (this folder)
│   ├── agentrules.md               # Agent behavior governance
│   ├── projectrules.md             # This file — codebase rules
│   ├── projectcontext.md           # Product context & architecture
│   ├── mvp_scope.md                # MVP scope & phases
│   ├── techstack.md                # Technical architecture
│   ├── datamodels.md               # Database schema & data models
│   ├── agentregistry.md            # All agents: specs, I/O, prompts
│   ├── promptlibrary.md            # LLM system prompts
│   ├── uxflows.md                  # UX flows & screen specs
│   ├── integrations.md             # Third-party integration specs
│   ├── monetization.md             # Pricing, billing, metering
│   ├── securityrules.md            # Security architecture
│   └── founderjourney.md           # Narrative user journey
│
├── apps/
│   └── web/                        # Next.js 14 frontend application
│       ├── public/                 # Static assets (favicon, og-image, robots.txt)
│       ├── src/
│       │   ├── app/                # Next.js App Router pages
│       │   │   ├── (auth)/         # Auth route group (login, signup, callback)
│       │   │   ├── (dashboard)/    # Dashboard route group
│       │   │   │   ├── dashboard/  # Main dashboard page
│       │   │   │   ├── ideas/      # Idea Studio (Dream Engine UI)
│       │   │   │   ├── warroom/    # War Room (Architect UI)
│       │   │   │   ├── agents/     # Agent Hub (Executor UI)
│       │   │   │   ├── compass/    # Compass (Coaching UI)
│       │   │   │   ├── vault/      # Founder Vault
│       │   │   │   ├── settings/   # User settings & integrations
│       │   │   │   └── billing/    # Subscription & billing
│       │   │   ├── api/            # Next.js API routes
│       │   │   │   ├── auth/       # Auth callback handlers
│       │   │   │   ├── agents/     # Agent trigger endpoints
# [v2 - deferred] Stripe - not in v1
│       │   │   │   ├── webhooks/   # Stripe [v2 - deferred], GitHub webhooks
│       │   │   │   └── integrations/ # Integration OAuth callbacks
│       │   │   ├── layout.tsx      # Root layout
│       │   │   └── page.tsx        # Landing page
│       │   ├── components/         # Reusable UI components
│       │   │   ├── ui/             # shadcn/ui primitives
│       │   │   ├── layout/         # Shell, sidebar, nav, header
│       │   │   ├── agents/         # Agent cards, execution UI, status
│       │   │   ├── dashboard/      # Dashboard widgets, charts
│       │   │   ├── ideas/          # Idea studio components
│       │   │   ├── warroom/        # War room components
│       │   │   ├── compass/        # Coaching UI components
│       │   │   └── shared/         # Cross-feature shared components
│       │   ├── hooks/              # Custom React hooks
│       │   │   ├── use-agent.ts    # Agent execution hook
│       │   │   ├── use-memory.ts   # Karnex Memory hook
│       │   │   ├── use-subscription.ts # Billing state hook
│       │   │   └── use-realtime.ts # Supabase Realtime hook
│       │   ├── lib/                # Utility libraries
│       │   │   ├── supabase/       # Supabase client (server + client)
# [v2 - deferred] Stripe - not in v1
│       │   │   ├── stripe [v2 - deferred]/         # Stripe [v2 - deferred] utilities
│       │   │   ├── api.ts          # API client for agent services
│       │   │   ├── utils.ts        # General utilities
│       │   │   └── constants.ts    # App-wide constants
│       │   ├── stores/             # Client-side state (Zustand)
│       │   ├── types/              # TypeScript type definitions
│       │   │   ├── agent.ts        # Agent-related types
│       │   │   ├── founder.ts      # Founder/user types
│       │   │   ├── database.ts     # Database row types (auto-generated)
│       │   │   └── api.ts          # API request/response types
│       │   └── styles/             # Global styles
│       │       └── globals.css     # Tailwind + custom CSS
│       ├── middleware.ts           # Auth middleware
│       ├── next.config.ts         # Next.js configuration
│       ├── tailwind.config.ts     # Tailwind configuration
│       ├── tsconfig.json          # TypeScript configuration
│       └── package.json
│
├── services/                       # Python agent microservices
│   ├── shared/                     # Shared Python utilities
│   │   ├── models/                 # Pydantic models (shared across agents)
│   │   ├── memory/                 # Karnex Memory client
│   │   ├── orchestration/          # LangGraph orchestration utilities
│   │   ├── integrations/           # Integration client wrappers
│   │   ├── config.py               # Shared configuration
│   │   └── logger.py               # Structured logging
│   │
│   ├── agents/                     # Individual agent implementations
│   │   ├── pain_transformer/       # Pain-to-Product Transformer
│   │   │   ├── agent.py            # Agent definition (LangGraph)
│   │   │   ├── prompts.py          # System prompts
│   │   │   ├── tools.py            # Agent tools/functions
│   │   │   ├── schemas.py          # Input/output Pydantic models
│   │   │   └── tests/              # Agent-specific tests
│   │   ├── idea_crystallizer/
│   │   ├── trend_radar/
│   │   ├── competitive_landscape/
│   │   ├── icp_definer/
│   │   ├── war_room/
│   │   ├── sprint_planner/
│   │   ├── decision_journal/
│   │   ├── milestone_tracker/
│   │   ├── risk_radar/
│   │   ├── builder/
│   │   ├── research/
│   │   ├── outreach/
│   │   ├── content_seo/
│   │   ├── sales/
│   │   ├── design/
│   │   ├── financial_modeling/
│   │   ├── legal_compliance/
│   │   ├── fundraising/
│   │   ├── analytics_insight/
│   │   ├── daily_standup/
│   │   ├── weekly_debrief/
│   │   ├── momentum_score/
│   │   ├── accountability/
│   │   ├── mirror/
│   │   ├── knowledge_graph/
│   │   └── mentor_library/
│   │
│   ├── api/                        # FastAPI application
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── routes/                 # Route handlers
│   │   │   ├── agents.py           # Agent execution endpoints
│   │   │   ├── memory.py           # Memory CRUD endpoints
│   │   │   ├── orchestration.py    # Multi-agent chain endpoints
│   │   │   └── health.py           # Health check endpoint
│   │   ├── middleware/             # Auth, CORS, rate limiting
│   │   └── dependencies.py        # FastAPI dependency injection
│   │
│   ├── pyproject.toml              # Python project configuration
│   ├── Dockerfile                  # Agent service container
│   └── requirements.txt           # Python dependencies
│
├── packages/                       # Shared packages (if monorepo)
│   └── types/                      # Shared TypeScript types between frontend and any TS services
│
├── supabase/                       # Supabase local development
│   ├── migrations/                 # SQL migrations (numbered sequentially)
│   ├── seed.sql                    # Development seed data
│   └── config.toml                 # Supabase local config
│
├── scripts/                        # Development and deployment scripts
│   ├── setup.sh                    # First-time project setup
│   ├── seed-agents.ts              # Seed agent registry in database
│   └── generate-types.sh           # Generate TypeScript types from Supabase
│
├── .env.example                    # Environment variable template
├── .gitignore
├── docker-compose.yml              # Local dev: Supabase + agent services
├── turbo.json                      # Turborepo config (if monorepo)
├── package.json                    # Root package.json
└── README.md                       # Project README
```

### Folder Purpose Reference

| Folder | Purpose | Who Writes Here |
|--------|---------|----------------|
| `.karnex/` | Product and project documentation | Humans + architect agents |
| `apps/web/` | All frontend code (Next.js) | Frontend developers + Builder Agent |
| `apps/web/src/app/` | Page routes (App Router) | Frontend developers |
| `apps/web/src/components/` | Reusable React components | Frontend developers + Builder Agent |
| `services/agents/` | Agent implementations (Python) | Agent developers |
| `services/shared/` | Code shared across all agent services | Platform developers |
| `services/api/` | FastAPI endpoints for agent services | Backend developers |
| `supabase/migrations/` | Database schema changes | Backend developers (NEVER agents) |
| `scripts/` | Development and build automation | Platform developers |

---

## 2. Naming Conventions

### Files & Directories

| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase | `AgentCard.tsx`, `SprintPlannerView.tsx` |
| React pages (App Router) | lowercase with `page.tsx` | `app/(dashboard)/agents/page.tsx` |
| Route groups | Parenthesized | `(auth)`, `(dashboard)` |
| React hooks | camelCase, `use-` prefix, kebab-case file | `use-agent.ts` → `useAgent()` |
| Utility modules | camelCase or kebab-case | `utils.ts`, `api-client.ts` |
| TypeScript types | PascalCase file, PascalCase type | `agent.ts` → `AgentRun`, `AgentOutput` |
| Python modules | snake_case | `pain_transformer/agent.py` |
| Python classes | PascalCase | `PainTransformerAgent` |
| Test files | `*.test.ts` / `test_*.py` | `AgentCard.test.tsx`, `test_pain_transformer.py` |
| CSS files | kebab-case | `globals.css` |
| Env variables | SCREAMING_SNAKE_CASE | `SUPABASE_URL`, `STRIPE [v2 - deferred]_SECRET_KEY` |

### Components

```typescript
// Component file: AgentCard.tsx
// Named export (not default)
export function AgentCard({ agent, onTrigger }: AgentCardProps) { ... }

// Props interface: always suffix with Props
interface AgentCardProps { ... }

// Component-specific types: colocate in the same file if small, 
// move to types/ if shared across components
```

### Database Tables & Columns

| Type | Convention | Example |
|------|-----------|---------|
| Table names | snake_case, plural | `agent_runs`, `outreach_contacts` |
| Column names | snake_case | `created_at`, `founder_id`, `momentum_score` |
| Primary keys | `id` (uuid) | `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| Foreign keys | `{table_singular}_id` | `founder_id`, `startup_id`, `agent_run_id` |
| Timestamps | `created_at`, `updated_at` | Always include both |
| Booleans | `is_` or `has_` prefix | `is_active`, `has_confirmed` |
| Enums | Create as PostgreSQL enums | `agent_status`, `subscription_tier` |
| Indexes | `idx_{table}_{column}` | `idx_agent_runs_founder_id` |
| RLS policies | `{table}_{action}_{scope}` | `agent_runs_select_own`, `founders_update_self` |

### Agent IDs

Format: `{agent-slug}-v{version}`

```
pain-transformer-v1
idea-crystallizer-v1
war-room-v1
sprint-planner-v1
builder-v1
research-v1
outreach-v1
daily-standup-v1
mirror-v1
```

### Environment Variables

Prefix by service:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# [v2 - deferred] Stripe - not in v1
# Stripe [v2 - deferred]
# [v2 - deferred] Stripe - not in v1
STRIPE [v2 - deferred]_SECRET_KEY=
# [v2 - deferred] Stripe - not in v1
STRIPE [v2 - deferred]_WEBHOOK_SECRET=
# [v2 - deferred] Stripe - not in v1
NEXT_PUBLIC_STRIPE [v2 - deferred]_PUBLISHABLE_KEY=

# AI
GOOGLE_GEMINI_API_KEY=
LANGCHAIN_API_KEY=
LANGCHAIN_TRACING_V2=

# Integrations
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
RESEND_API_KEY=
POSTHOG_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=

# Service URLs
AGENT_SERVICE_URL=
NEXT_PUBLIC_APP_URL=
```

---

## 3. Code Style Rules

### TypeScript (Frontend)

```jsonc
// tsconfig.json strict mode settings (non-negotiable)
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "exactOptionalPropertyTypes": false // Too strict for component props
  }
}
```

**Rules:**

1. **No `any`.** Use `unknown` + type narrowing when type is truly unknown. `Record<string, unknown>` for dynamic objects.
2. **No `enum`.** Use `as const` objects or union types instead.
3. **Prefer interfaces over types** for object shapes. Use `type` for unions, intersections, and utility types.
4. **Explicit return types** on all exported functions. Inferred types are fine for internal/private functions.
5. **No barrel exports** (index.ts re-exports). Import directly from the source file.
6. **Prefer named exports** over default exports. Exception: Next.js page components use default export (framework requirement).

### React Patterns

```typescript
// ✅ Server Component by default (App Router)
// Only add "use client" when the component needs:
// - useState, useEffect, or other hooks
// - Event handlers (onClick, onChange)
// - Browser APIs

// ✅ Component pattern
export function AgentCard({ agent, onTrigger }: AgentCardProps) {
  // 1. Hooks first
  const [isRunning, setIsRunning] = useState(false);
  
  // 2. Derived state
  const statusColor = getStatusColor(agent.status);
  
  // 3. Event handlers
  const handleTrigger = async () => { ... };
  
  // 4. Early returns for loading/error states
  if (!agent) return <AgentCardSkeleton />;
  
  // 5. Render
  return ( ... );
}

// ✅ Custom hook pattern
export function useAgent(agentId: string) {
  // Single responsibility — one hook, one concern
  // Return object, not array (except for simple [value, setter] patterns)
  return { agent, isLoading, error, trigger, cancel };
}
```

**Anti-patterns (forbidden):**
- No `useEffect` for data fetching — use Server Components, React Query, or SWR
- No prop drilling beyond 2 levels — use context or Zustand
- No inline styles — use Tailwind classes
- No string concatenation for class names — use `cn()` utility (from shadcn/ui)

### Python (Agent Services)

```python
# Python 3.11+ required
# Type hints on all function signatures
# Pydantic v2 for all data models
# Async by default (FastAPI is async-native)

# ✅ Agent file pattern
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph
from pydantic import BaseModel, Field

class PainTransformerInput(BaseModel):
    """Input schema for the Pain-to-Product Transformer agent."""
    pain_description: str = Field(..., min_length=10, max_length=5000)
    industry_context: str | None = None
    
class PainTransformerOutput(BaseModel):
    """Output schema for the Pain-to-Product Transformer agent."""
    hypotheses: list[ProductHypothesis]
    confidence: Literal["low", "medium", "high"]
    
# Docstrings: Google style
# Formatting: ruff (format + lint)
# Import ordering: ruff isort
```

---

## 4. Git Workflow

### Branch Naming

```
main                          # Production-ready code. Protected. Requires PR.
develop                       # Integration branch. All PRs merge here first.
feature/{ticket}-{description} # New features
fix/{ticket}-{description}     # Bug fixes
agent/{agent-slug}             # New agent implementation
docs/{description}             # Documentation changes
refactor/{description}         # Code refactoring (no behavior change)
hotfix/{description}           # Emergency production fixes (merge to main directly)
```

**Examples:**
```
feature/KX-42-agent-hub-ui
fix/KX-88-outreach-rate-limit
agent/pain-transformer
docs/update-agent-registry
refactor/memory-client-async
# [v2 - deferred] Stripe - not in v1
hotfix/stripe [v2 - deferred]-webhook-validation
```

### Commit Message Format (Conventional Commits)

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Types:**

| Type | When to Use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons (no logic change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or correcting tests |
| `chore` | Build process, dependency updates, tooling |
| `agent` | Agent-specific changes (prompts, tools, schemas) |

**Scopes:** `web`, `agents`, `api`, `db`, `infra`, `docs`, agent slug (e.g., `pain-transformer`)

**Examples:**
```
feat(web): add agent execution status component with real-time updates
fix(agents/outreach): handle Gmail API 429 rate limit with exponential backoff
agent(pain-transformer): tune system prompt for higher hypothesis diversity
docs: update agent registry with mirror agent v1 specification
chore(db): add migration for outreach_contacts table
test(agents/research): add integration test for web search tool
```

### Pull Request Rules

1. **Every PR must have:**
   - Descriptive title following commit message format
   - Description: what changed, why, and how to test
   - Linked ticket/issue (if applicable)
   - At least 1 reviewer approval (can be an AI agent reviewer for automated PRs)
   
2. **PR size limits:**
   - Aim for < 400 lines changed
   - If larger, split into stacked PRs with clear dependency order
   
3. **Before merge:**
   - All CI checks pass (lint, type check, tests)
   - No merge conflicts
   - Branch is up to date with `develop`

4. **Merge strategy:** Squash merge to `develop`. Merge commit from `develop` to `main`.

---

## 5. Agent Service Conventions

### Registering a New Agent

1. **Create the agent directory:** `services/agents/{agent_slug}/`
2. **Implement required files:**
   - `agent.py` — LangGraph state graph definition
   - `prompts.py` — System prompt and prompt templates
   - `tools.py` — Tool/function definitions
   - `schemas.py` — Pydantic input/output models
   - `tests/` — Unit and integration tests
3. **Register the route:** Add endpoint in `services/api/routes/agents.py`
4. **Update the registry:** Add entry to `.karnex/agentregistry.md`
5. **Update the prompt library:** Add full prompt to `.karnex/promptlibrary.md`
6. **Add database migration:** If the agent needs new tables or columns

### Agent Versioning Protocol

```python
# Every agent module exports its version
AGENT_VERSION = "v1"
AGENT_ID = f"pain-transformer-{AGENT_VERSION}"

# Version bump triggers:
# - Breaking change to input/output schema → major version bump
# - Prompt rewrite → major version bump
# - Tool addition/removal → major version bump
# - Prompt tuning → log in changelog, no version bump
# - Bug fix → log in changelog, no version bump
```

### Agent Testing Requirements

| Test Type | Requirement | Coverage |
|-----------|------------|----------|
| Unit tests | Required | All tools/functions, schema validation |
| Prompt tests | Required | Key prompt behaviors with mock LLM responses |
| Integration tests | Required for MVP agents | End-to-end with real LLM (use test API key) |
| Handoff tests | Required | Verify handoff payload schema for each receiving agent |
| Rate limit tests | Required | Verify self-imposed rate limits are enforced |

---

## 6. Environment Variable Management

### Rules

1. **Never commit `.env` files.** `.env*` is in `.gitignore`.
2. **Always update `.env.example`** when adding a new variable. Include a description comment.
3. **Prefix convention:**
   - `NEXT_PUBLIC_*` — Safe for client-side exposure (Supabase anon key, PostHog key)
   - Everything else — Server-only. Never expose to browser.
4. **Validation:** Environment variables are validated at startup. Missing required variables cause a hard failure with a clear error message.

```typescript
// apps/web/src/lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  # [v2 - deferred] Stripe - not in v1
  STRIPE [v2 - deferred]_SECRET_KEY: z.string().startsWith("sk_"),
  AGENT_SERVICE_URL: z.string().url(),
  // ... all variables validated
});

export const env = envSchema.parse(process.env);
```

### Environment Strategy

| Environment | Supabase | Stripe [v2 - deferred] | Agents | Frontend |
|-------------|----------|--------|--------|----------|
| **local** | Supabase CLI (local) | Test mode | Local Docker | `localhost:3000` |
| **staging** | Supabase project (staging) | Test mode | Railway (staging) | Vercel preview |
| **production** | Supabase project (prod) | Live mode | Railway (prod) | Vercel production |

---

## 7. Database Migration Rules

### Supabase Migration Workflow

1. **Create migration:** `supabase migration new {description}` → generates a numbered `.sql` file
2. **Write SQL:** Pure SQL. No ORM-generated migrations.
3. **Include in migration:**
   - Table creation/alteration
   - Index creation
   - RLS policy creation
   - Enum type creation
   - Trigger/function creation
4. **Review checklist:**
   - [ ] Migration is idempotent (uses `IF NOT EXISTS`, `IF EXISTS`)
   - [ ] RLS is enabled on every new table
   - [ ] RLS policies cover SELECT, INSERT, UPDATE, DELETE for the owner
   - [ ] All foreign keys have `ON DELETE` behavior specified
   - [ ] Indexes exist for all foreign key columns and common query patterns
   - [ ] `created_at` and `updated_at` columns are present
   - [ ] `updated_at` has a trigger to auto-update
5. **Apply locally:** `supabase db reset` (destructive) or `supabase migration up`
6. **Apply to staging:** Supabase dashboard or CLI push
7. **Apply to production:** Supabase dashboard or CLI push (after staging verification)

### Migration Naming

```
20260528100000_create_founders_table.sql
20260528100001_create_startups_table.sql
20260528100002_create_agent_runs_table.sql
20260528100003_add_momentum_score_to_founders.sql
```

### Rollback Strategy

- Every migration must have a corresponding rollback comment at the top:
```sql
-- ROLLBACK: DROP TABLE IF EXISTS founders CASCADE;

CREATE TABLE founders ( ... );
```

---

## 8. API Design Rules

### Next.js API Routes (BFF — Backend for Frontend)

```
Route pattern: /api/{resource}/{action?}

GET    /api/agents                  → List available agents
POST   /api/agents/{agent-id}/run   → Trigger an agent run
GET    /api/agents/runs/{run-id}    → Get run status + output
DELETE /api/agents/runs/{run-id}    → Cancel a running agent

GET    /api/memory?namespace=X      → Query memory
POST   /api/memory                  → Write memory entry

# [v2 - deferred] Stripe - not in v1
POST   /api/webhooks/stripe [v2 - deferred]         → Stripe [v2 - deferred] webhook handler
POST   /api/webhooks/github         → GitHub webhook handler
```

### FastAPI Agent Service (Internal API)

```
POST   /v1/agents/{agent-id}/execute   → Execute an agent
GET    /v1/agents/{agent-id}/status/{run-id}  → Check execution status
POST   /v1/orchestration/chain          → Execute a multi-agent chain
GET    /v1/health                       → Health check
```

### Error Response Format (All APIs)

```typescript
interface ApiError {
  error: {
    code: string;        // Machine-readable: "AGENT_EXECUTION_FAILED", "RATE_LIMIT_EXCEEDED"
    message: string;     // Human-readable description
    details?: unknown;   // Additional context (field errors, retry-after, etc.)
    request_id: string;  // For debugging and support
  };
}
```

**Standard HTTP status codes:**

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (validation errors) |
| 401 | Unauthorized (missing/invalid JWT) |
| 403 | Forbidden (valid JWT but insufficient permissions — wrong founder) |
| 404 | Not found |
| 409 | Conflict (e.g., agent already running for this task) |
| 422 | Unprocessable entity (valid JSON but invalid content) |
| 429 | Rate limited |
| 500 | Internal server error |

### Auth Middleware Pattern

```typescript
// Next.js middleware (apps/web/middleware.ts)
// 1. Check Supabase session
// 2. If no session → redirect to /login (for pages) or 401 (for API)
// 3. If session → attach user to request
// 4. Route-specific auth checks in API handlers

// Agent service auth (services/api/middleware/auth.py)
// 1. Validate JWT from Authorization header
// 2. Verify JWT against Supabase JWKS
// 3. Extract founder_id from JWT claims
// 4. Attach founder_id to request context
// 5. All database queries filter by founder_id (defense in depth with RLS)
```

---

## 9. Testing Requirements

### What Must Be Tested Before Merge

| Layer | Required Tests | Tool |
|-------|---------------|------|
| React components | Render tests + interaction tests for complex components | Vitest + React Testing Library |
| API routes | Request/response validation, auth enforcement | Vitest + supertest |
| Agent schemas | Input validation, output schema compliance | Pytest + Pydantic |
| Agent tools | Each tool function tested in isolation | Pytest |
| Agent prompts | Key behaviors validated with mock LLM | Pytest |
| Database migrations | Migration applies cleanly on fresh + existing DB | Supabase CLI |
| Integration tests | Agent end-to-end execution (staging only) | Pytest |

### Test File Location

- Frontend: colocated `*.test.tsx` / `*.test.ts` next to source file
- Backend: `tests/` directory inside each agent folder + `services/api/tests/`

### Coverage Targets

| Module | Coverage Target |
|--------|----------------|
| `apps/web/src/hooks/` | 80% |
| `apps/web/src/lib/` | 90% |
| `services/agents/*/tools.py` | 90% |
| `services/agents/*/schemas.py` | 100% |
| `services/api/routes/` | 80% |
| Overall | 70% (enforced in CI) |

---

## 10. Logging and Observability Standards

### Structured Logging Format

```json
{
  "timestamp": "2026-05-28T10:00:00Z",
  "level": "info",
  "service": "agent-service",
  "agent_id": "pain-transformer-v1",
  "founder_id": "uuid",
  "run_id": "uuid",
  "message": "Agent execution completed",
  "duration_ms": 4523,
  "tokens_used": 2847,
  "metadata": {}
}
```

### Log Levels

| Level | When to Use |
|-------|------------|
| `debug` | Detailed execution flow (disabled in production) |
| `info` | Normal operations: agent started, completed, handoff initiated |
| `warn` | Recoverable issues: retry triggered, stale data used, rate limit approaching |
| `error` | Failed operations: agent failed, integration error, data corruption |
| `fatal` | System-level failures requiring immediate attention |

### Observability Stack

| Concern | Tool | What We Track |
|---------|------|--------------|
| Application logging | Structured JSON logs → stdout | All agent executions, API requests, errors |
| Product analytics | PostHog | User actions, feature usage, funnel conversion |
| Error tracking | Sentry (or PostHog errors) | Unhandled exceptions, error rates, stack traces |
| Agent tracing | LangSmith (LangChain) | LLM calls, tool invocations, chain execution, token usage |
| Infrastructure | Vercel Analytics + Railway logs | Response times, cold starts, resource usage |
| Uptime | Better Uptime (or similar) | Service availability, SSL expiry, DNS |

### Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Agent success rate | Agent service logs | < 95% → alert |
| Agent p95 latency | Agent service logs | > 30s → alert |
| API error rate | Next.js API logs | > 5% → alert |
| Token usage per agent per day | LangSmith | > 150% of daily average → warn |
| Supabase connection pool | Supabase dashboard | > 80% utilization → alert |
| Stripe [v2 - deferred] webhook processing time | Webhook logs | > 5s → warn |

### PII in Logs

**Never log in plaintext:**
- Email addresses → `[PII:email]`
- Full names → `[PII:name]`
- API keys / tokens → `[REDACTED]`
- Financial figures → `[PII:financial]`

---

*Last updated: 2026-05-28 | Version: 1.0.0*
*These rules are enforced by CI/CD checks and code review. Exceptions require explicit approval from the project architect.*
