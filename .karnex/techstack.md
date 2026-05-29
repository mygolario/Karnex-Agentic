# Karnex — Technical Architecture

> **Complete technical architecture document.** Every technology choice, how services communicate, and how the system is deployed.

---

## 1. Complete Tech Stack

| Layer | Technology | Version | Purpose | Rationale |
|---|---|---|---|---|
| **Frontend Framework** | Next.js | 14 (App Router) | SSR/SSG React application | Industry-standard React framework; App Router enables Server Components for performance; seamless Vercel deployment; excellent TypeScript support |
| **Language (Frontend)** | TypeScript | 5.4+ | Type-safe frontend development | Catches bugs at compile time; excellent IDE support; mandatory for production-grade applications |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first CSS framework | Fastest styling approach for solo dev + AI-generated code; consistent design tokens; excellent purging for small bundles |
| **UI Components** | shadcn/ui | Latest | Pre-built, customizable components | Copy-paste model — no dependency lock-in; built on Radix UI primitives for accessibility; fully customizable; pairs perfectly with Tailwind |
| **State Management** | Zustand | 4.5+ | Client-side state management | Minimal boilerplate; TypeScript-native; small bundle size; no provider wrapper needed |
| **Database** | Supabase (PostgreSQL) | Latest | Primary database, auth, storage, realtime | All-in-one backend: PostgreSQL + GoTrue Auth + S3-compatible storage + WebSocket realtime. Perfect for solo dev velocity. RLS provides row-level security without a separate auth layer |
| **Auth** | Supabase Auth (GoTrue) | Built-in | User authentication & session management | Integrated with database; supports email + OAuth (Google); JWT-based; handles refresh token rotation automatically |
| **Backend (Agents)** | Python FastAPI | 0.111+ | Agent microservice API | LangChain/LangGraph ecosystem is Python-native; FastAPI provides async performance with automatic OpenAPI docs; Pydantic for request validation |
| **LLM Provider** | Google Gemini API | 2.0 Flash / 2.5 Pro | Primary language model | Best price/performance ratio; large context windows (1M+ tokens); strong function calling; multimodal support; Gemini 2.0 Flash for fast agents, 2.5 Pro for complex reasoning |
| **Agent Framework** | LangChain + LangGraph | 0.2+ / 0.1+ | Agent orchestration & chaining | State-machine-based agent orchestration; built-in persistence; human-in-the-loop support; graph-based multi-agent chaining; native tool-use support |
| **Agent Runtime** | Google AntiGravity | Latest | Agent execution runtime | Purpose-built for agentic workloads; native tool-use; handles long-running tasks; sandboxed execution |
| **Agent Tracing** | LangSmith | Latest | LLM observability & debugging | Traces every LLM call, tool invocation, and chain execution; essential for prompt debugging and optimization |
| **Payments (v1)** | OxaPay | Latest | Primary payment gateway (crypto) | Allows global stablecoin (USDT/USDC) billing. Subscription limits and state are self-managed in Supabase. |
| **Payments (v2)** | Stripe [v2 - deferred] | Latest API | Credit card payments (Stripe [v2 - deferred]) | Deferred to v2 as an alternative payment channel. |
| **Email (Transactional)** | Resend | Latest | System emails, billing reminders, notifications | Modern developer-friendly API; great deliverability; React Email for templates; simple pricing. Used to email manual renewal links. |
| **Email (Outreach)** | Gmail API | v1 | Founder outreach email sending | Sends from founder's own Gmail; better deliverability than cold email services; OAuth-based access |
| **Analytics** | PostHog | Latest (cloud) | Product analytics & session recording | Open-source; no sampling; event-based analytics; session recordings; feature flags; funnels |
| **Frontend Hosting** | Vercel | N/A | Frontend deployment | Zero-config Next.js deployment; preview deploys on PRs; edge functions; analytics |
| **Backend Hosting** | Railway | N/A | Python service deployment | Simple Docker deployment; auto-scaling; built-in logging; health checks; staging + production environments |
| **Code Integration** | GitHub API | v4 (GraphQL) + v3 (REST) | Code repository management | Push generated code to founder repos; PR creation; webhook events |
| **Project Mgmt** | Notion API | 2022-06-28 | (v2) Import/export project data | Deferred to v2. Allow founders to sync roadmaps and tasks with Notion |
| **Data Integration** | Airtable API | Latest | (v2) Structured data import/export | Deferred to v2. Import customer lists, sync CRM data |
| **Scheduling** | Cal.com API | Latest | (v2) Meeting scheduling for sales | Deferred to v2. Integrate with Sales Agent for demo booking |

> [!NOTE]
> OpenRouter used as LLM proxy for MVP development.
> Migrate to direct Google Gemini API for production to eliminate proxy latency and vendor dependency.

---

## 2. System Architecture Overview

```
                                    ┌─────────────────┐
                                    │   Founder's      │
                                    │   Browser        │
                                    └────────┬─────────┘
                                             │ HTTPS
                                             ▼
┌────────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE NETWORK                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Next.js 14 Application                          │  │
│  │                                                              │  │
│  │  ┌─────────────────┐    ┌─────────────────────────────────┐ │  │
│  │  │  React Server   │    │  API Routes (BFF Layer)          │ │  │
│  │  │  Components     │    │                                  │ │  │
│  │  │  (SSR Pages)    │    │  /api/agents/*    → Agent Proxy  │ │  │
│  │  │                 │    │  /api/webhooks/oxapay → Callback │ │  │
│  │  │  Static Pages   │    │  /api/auth/*      → Auth Callback│ │  │
│  │  │  (SSG/ISR)      │    │  /api/memory/*    → Memory CRUD  │ │  │
│  │  └─────────────────┘    └──────────┬──────────────────────┘ │  │
│  └─────────────────────────────────────┼────────────────────────┘  │
└────────────────────────────────────────┼───────────────────────────┘
                                         │
                    ┌────────────────────┼──────────────────────┐
                    │                    │                      │
                    ▼                    ▼                      ▼
    ┌───────────────────┐  ┌───────────────────┐  ┌──────────────────┐
    │   SUPABASE        │  │  AGENT SERVICE    │  │  EXTERNAL APIs   │
    │                   │  │  (Railway)        │  │                  │
    │  ┌─────────────┐  │  │  ┌─────────────┐  │  │  OxaPay          │
    │  │ PostgreSQL  │  │  │  │  FastAPI     │  │  │  Gmail API       │
    │  │ + RLS       │◄─┼──┤  │  Application │  │  │  GitHub API      │
    │  └─────────────┘  │  │  └──────┬──────┘  │  │  Resend           │
    │  ┌─────────────┐  │  │         │         │  │  PostHog          │
    │  │ GoTrue Auth │  │  │  ┌──────▼──────┐  │  │  Google Gemini    │
    # [v2 - deferred] Stripe - not in v1
    │  │ (JWT)       │  │  │  │ LangGraph   │  │  │  Stripe [v2 - deferred] [v2]      │
    │  └─────────────┘  │  │  │ Engine      │  │  └──────────────────┘
    │  ┌─────────────┐  │  │  │             │  │
    │  │ Realtime    │  │  │  │ Agent 1     │  │
    │  │ (WebSocket) │──┼──┤  │   ↓         │  │
    │  └─────────────┘  │  │  │ Agent 2     │  │
    │  ┌─────────────┐  │  │  │   ↓         │  │
    │  │ Storage     │  │  │  │ Agent 3     │  │
    │  │ (S3)        │  │  │  └─────────────┘  │
    │  └─────────────┘  │  └───────────────────┘
    └───────────────────┘
```

### Communication Patterns

| From → To | Protocol | Auth | Purpose |
|---|---|---|---|
| Browser → Next.js | HTTPS | Supabase JWT (cookie) | Page requests, API calls |
| Next.js → Supabase | HTTPS | Service Role Key (server) / Anon Key (client) | Database queries, auth operations |
| Next.js → Agent Service | HTTPS | Internal API key + Founder JWT | Trigger agent execution |
| Agent Service → Supabase | HTTPS | Service Role Key | Read/write agent data, memory |
| Agent Service → Gemini | HTTPS | API Key | LLM inference |
| Agent Service → External APIs | HTTPS | Per-integration OAuth/API key | GitHub, Gmail, etc. |
| Supabase → Browser | WebSocket | Supabase JWT | Realtime updates (agent status) |
| OxaPay → Next.js | HTTPS (webhook) | Webhook signature verification (HMAC-SHA512) | Payment confirmations / expirations |
| Stripe [v2 - deferred] → Next.js | HTTPS (webhook) [v2 - deferred] | Webhook signature verification [v2 - deferred] | Credit card payment events [v2 - deferred] |

---

## 3. Agent Runtime Architecture

### How Agents Are Hosted

```
┌───────────────────────────────────────────────────────┐
│              FastAPI Agent Service (Railway)            │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Agent Execution Engine                 │  │
│  │                                                   │  │
│  │  1. Receive execution request (agent_id + input)  │  │
│  │  2. Load agent definition (LangGraph StateGraph)  │  │
│  │  3. Inject founder context from Karnex Memory     │  │
│  │  4. Execute agent graph                           │  │
│  │     a. LLM calls (Gemini API)                    │  │
│  │     b. Tool calls (web search, code gen, etc.)   │  │
│  │     c. State transitions                          │  │
│  │  5. Write output to Supabase                      │  │
│  │  6. Trigger Realtime update                       │  │
│  │  7. Execute handoff (if next agent specified)     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌────────────────┐  ┌────────────────┐               │
│  │  Agent Registry │  │ Memory Client  │               │
│  │  (in-memory map │  │ (Supabase SDK) │               │
│  │  of all agents) │  └────────────────┘               │
│  └────────────────┘                                    │
└───────────────────────────────────────────────────────┘
```

### Agent Triggering Mechanisms

| Trigger Type | Mechanism | Example |
|---|---|---|
| **User-initiated** | HTTP POST to `/v1/agents/{id}/execute` | Founder clicks "Generate Product Brief" |
| **Agent handoff** | Internal function call within LangGraph | Pain-to-Product completes → triggers Idea Crystallizer |
| **Scheduled** | Cron job via Railway scheduler | Daily Standup runs at 9 AM founder's local time |
| **Event-driven** | Supabase database trigger → webhook | New task completed → triggers Momentum Score recalculation |
| **Webhook** | External service notification | OxaPay payment completed → triggers subscription activation |

### Long-Running Agent Handling

Agents that take > 30 seconds (e.g., Builder Agent generating a full codebase):

1. **Immediate response:** API returns `202 Accepted` with a `run_id`
2. **Background execution:** Agent runs in a background asyncio task
3. **Progress updates:** Agent writes status updates to `agent_runs` table (`queued` → `running` → `success`/`error`)
4. **Realtime push:** Supabase Realtime broadcasts status changes to the frontend via WebSocket
5. **Timeout:** Maximum execution time per agent: 5 minutes (configurable). Kill and log on timeout.

```python
# Agent execution flow (simplified)
@router.post("/v1/agents/{agent_id}/execute")
async def execute_agent(agent_id: str, request: AgentExecutionRequest):
    # 1. Create run record
    run = await create_agent_run(agent_id, request.founder_id, request.input)
    
    # 2. Start background execution
    asyncio.create_task(
        run_agent_background(run.id, agent_id, request)
    )
    
    # 3. Return immediately
    return {"run_id": run.id, "status": "queued"}

async def run_agent_background(run_id: str, agent_id: str, request):
    try:
        await update_run_status(run_id, "running")
        agent = load_agent(agent_id)
        memory = await load_founder_memory(request.founder_id)
        result = await agent.ainvoke({**request.input, "memory": memory})
        await save_agent_output(run_id, result)
        await update_run_status(run_id, "success")
        await update_founder_memory(request.founder_id, result.memory_updates)
    except Exception as e:
        await update_run_status(run_id, "error", error=str(e))
```

---

## 4. Database Schema Overview

### Core Tables and Relationships

```
auth.users (Supabase managed)
    │
    ├──< founders (1:1 — extended profile)
    │       │
    │       ├──< startups (1:many — projects)
    │       │       │
    │       │       ├──< ideas (1:many — product hypotheses)
    │       │       ├──< roadmaps (1:many — 90-day plans)
    │       │       │       │
    │       │       │       └──< sprints (1:many — weekly sprints)
    │       │       │               │
    │       │       │               └──< tasks (1:many — sprint tasks)
    │       │       │
    │       │       ├──< outreach_campaigns (1:many)
    │       │       │       │
    │       │       │       └──< outreach_contacts (1:many)
    │       │       │
    │       │       ├──< milestones (1:many)
    │       │       └──< decisions (1:many)
    │       │
    │       ├──< agent_runs (1:many — all agent executions)
    │       │       │
    │       │       └──< agent_outputs (1:1 — stored output per run)
    │       │
    │       ├──< founder_memory (1:many — persistent context)
    │       ├──< integrations (1:many — connected services)
    │       ├──< payments (1:many — self-managed transactions)
    │       ├──< renewal_reminders (1:many — automated Resend logs)
    │       └──< subscriptions (1:1 — self-managed billing state)
    │
    └── (Supabase Auth handles sessions, refresh tokens, etc.)
```

### Key Indexes for Performance

```sql
-- Most frequent queries
CREATE INDEX idx_agent_runs_founder_status ON agent_runs(founder_id, status);
CREATE INDEX idx_agent_runs_founder_created ON agent_runs(founder_id, created_at DESC);
CREATE INDEX idx_founder_memory_namespace ON founder_memory(founder_id, namespace, key);
CREATE INDEX idx_tasks_sprint_status ON tasks(sprint_id, status);
CREATE INDEX idx_ideas_startup ON ideas(startup_id, created_at DESC);
CREATE INDEX idx_outreach_contacts_campaign ON outreach_contacts(campaign_id, status);
CREATE INDEX idx_payments_oxapay_track ON payments(oxapay_track_id);
# [v2 - deferred] Stripe - not in v1
CREATE INDEX idx_subscriptions_stripe [v2 - deferred] ON subscriptions(stripe [v2 - deferred]_subscription_id) WHERE stripe [v2 - deferred]_subscription_id IS NOT NULL;
```

---

## 5. Auth & Webhook Security

### Authentication Flow

```
┌──────────┐     ┌───────────┐     ┌──────────────┐     ┌──────────┐
│  Browser  │────▶│ Supabase  │────▶│ GoTrue Auth  │────▶│ Provider │
│           │     │ Client JS │     │  Service     │     │ (Google) │
└──────────┘     └───────────┘     └──────────────┘     └──────────┘
     │                                     │
     │  ◄── JWT (access_token) ───────────┘
     │  ◄── refresh_token (httpOnly cookie)
     │
     ▼
┌──────────────────────────────────────┐
│  Next.js Middleware                   │
│                                      │
│  1. Read Supabase session from cookie│
│  2. Validate JWT expiry              │
│  3. Refresh if expired (auto)        │
│  4. Attach user to request           │
│  5. Redirect to /login if no session │
└──────────────────────────────────────┘
```

### JWT Structure

```json
{
  "aud": "authenticated",
  "exp": 1716897600,
  "sub": "founder-uuid",
  "email": "founder@example.com",
  "role": "authenticated",
  "app_metadata": {
    "provider": "google",
    "subscription_tier": "builder"
  },
  "user_metadata": {
    "full_name": "Alex Chen",
    "avatar_url": "..."
  }
}
```

### Session Management

| Setting | Value | Rationale |
|---|---|---|
| Access token expiry | 1 hour | Short-lived for security |
| Refresh token expiry | 7 days | Balance security and UX |
| Refresh token rotation | Enabled | Each refresh issues new refresh token, invalidates old |
| Session storage | httpOnly secure cookie | Prevents XSS access to tokens |

### RLS Policy Pattern

```sql
-- Standard RLS pattern for founder-scoped tables
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

-- Founders can only see their own agent runs
CREATE POLICY "agent_runs_select_own" ON agent_runs
  FOR SELECT USING (founder_id = auth.uid());

-- Founders can only insert their own agent runs
CREATE POLICY "agent_runs_insert_own" ON agent_runs
  FOR INSERT WITH CHECK (founder_id = auth.uid());

-- Founders can only update their own agent runs
CREATE POLICY "agent_runs_update_own" ON agent_runs
  FOR UPDATE USING (founder_id = auth.uid());

-- Founders can only delete their own agent runs
CREATE POLICY "agent_runs_delete_own" ON agent_runs
  FOR DELETE USING (founder_id = auth.uid());
```

---

## 5.1 Webhook Security

To protect the manual billing endpoints from spoofing and validation bypasses, the webhook receiver enforces cryptographic verification of payloads.

### OxaPay Webhook Signature Verification
OxaPay signs every webhook payload using HMAC-SHA512 with the merchant's MERCHANT_API_KEY as the shared secret. The signature is computed over the raw POST body and sent in the HMAC HTTP header. Verification: compute HMAC-SHA512 of raw body using MERCHANT_API_KEY, compare result to the HMAC header value using a timing-safe comparison. Reject any request where signatures do not match. On success, immediately respond with HTTP 200 and body exactly "ok" to prevent retries.

---

## 6. API Architecture

### Request Flow

```
Browser Request
    │
    ▼
┌─────────────────────────────────────────────────┐
│ Next.js Middleware (middleware.ts)                │
│ → Validate Supabase session                      │
│ → Redirect unauthenticated requests to /login    │
│ → Pass authenticated requests through            │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ Next.js API Route Handler                        │
│                                                  │
│ 1. Parse & validate request body (Zod)           │
│ 2. Check subscription status (gating)            │
│ 3. Check rate limits                             │
│ 4. Deduct agent task credit (if applicable)      │
│ 5. Proxy to Agent Service OR query Supabase      │
│ 6. Return standardized response                  │
└────────────────────┬────────────────────────────┘
                     │ (if agent execution)
                     ▼
┌─────────────────────────────────────────────────┐
│ FastAPI Agent Service                            │
│                                                  │
│ 1. Validate internal API key + founder JWT       │
│ 2. Load agent by ID                              │
│ 3. Execute via LangGraph                         │
│ 4. Write results to Supabase                     │
│ 5. Return run_id for polling                     │
└─────────────────────────────────────────────────┘
```

### API Route Structure

```typescript
// apps/web/src/app/api/agents/[agentId]/run/route.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const RunAgentSchema = z.object({
  input: z.record(z.unknown()),
});

export async function POST(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  // 1. Auth
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  
  // 2. Validate
  const body = RunAgentSchema.parse(await request.json());
  
  // 3. Check subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("tier, credits_remaining, status")
    .eq("founder_id", user.id)
    .single();
  if (!sub || sub.status !== "active" || sub.credits_remaining <= 0) {
    return NextResponse.json({ error: { code: "CREDITS_EXHAUSTED_OR_INACTIVE" } }, { status: 402 });
  }
  
  // 4. Proxy to agent service
  const response = await fetch(`${env.AGENT_SERVICE_URL}/v1/agents/${params.agentId}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
      "X-Internal-Key": env.AGENT_SERVICE_INTERNAL_KEY,
    },
    body: JSON.stringify({ founder_id: user.id, input: body.input }),
  });
  
  // 5. Deduct credit
  await supabase.rpc("deduct_agent_credit", { founder_id: user.id });
  
  return NextResponse.json(await response.json(), { status: 202 });
}
```

---

## 7. Karnex Memory Design

Refer to [datamodels.md](file:///c:/Karnex-Agentic/.karnex/datamodels.md) for full storage schemas and namespaces. Memory updates are propagated globally to all execution loops.

---

## 8. Agent Orchestration Pattern

LangGraph graphs manage sequential steps, conditional routing, and Human-in-the-loop checkpoints. (See [techstack.md](file:///c:/Karnex-Agentic/.karnex/techstack.md) v1 definition).

---

## 9. Integration Architecture

OAuth integrations (Gmail, GitHub) utilize token encryption using Supabase Vault primitives. The billing integration with OxaPay is API-key authorized, and Stripe [v2 - deferred] **[v2 - deferred]** is configured in a dormant state.

---

## 10. Deployment Architecture

### Environment Strategy

- **local**: Local dev servers + local Supabase CLI + OxaPay Sandbox mode active + mock email services.
- **staging**: Railway backend + Vercel edge deployment + separate staging Supabase database + OxaPay Sandbox.
- **production**: Production Railway + Vercel + production Supabase database + OxaPay Live Merchant Key.

### Railway Configuration

```yaml
# railway.toml
[build]
  builder = "DOCKERFILE"
  dockerfilePath = "services/Dockerfile"

[deploy]
  healthcheckPath = "/v1/health"
  healthcheckTimeout = 30
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 3

#### Railway Scheduled Cron Job (Subscription Renewals)

To execute the daily subscription renewal checker at `services/cron/renewal_check.py` at 09:00 UTC, configure a Railway cron service:
1. **Service Type**: Add a new Cron service/task in the Railway project.
2. **Start Command**: Set the execute command to:
   ```bash
   python services/cron/renewal_check.py
   ```
3. **Schedule**: Set the cron schedule expression to `0 9 * * *` (runs every day at 09:00 UTC).
4. **Environment Variables**: Inject the same env vars (especially `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) as the main API service.

---

## 11. Secrets & Env Variables Management

| Secret Type | Storage Location | Access Method |
|---|---|---|
| Supabase keys | Vercel env vars + Railway env vars | `process.env` / `os.environ` |
| OxaPay API keys | Vercel env vars + Railway env vars | `process.env` / `os.environ` |
| Stripe [v2 - deferred] keys | Vercel env vars + Railway env vars | `process.env` / `os.environ` |
| Google Gemini API key | Railway env vars | `os.environ` (agent service only) |
| Integration OAuth tokens | Supabase `integrations` table (encrypted) | Supabase Vault / `pgcrypto` |

```python
# services/shared/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GOOGLE_GEMINI_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    AGENT_SERVICE_INTERNAL_KEY: str
    OXAPAY_MERCHANT_API_KEY: str
    OXAPAY_WEBHOOK_SECRET: str
    ENVIRONMENT: str = "development"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

*Last updated: 2026-05-28 | Version: 1.1.0*
*Primary payments: OxaPay. Stripe [v2 - deferred] references marked [v2 - deferred]. Webhook signature verification HMAC-SHA512 documented.*
