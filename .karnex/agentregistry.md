# Karnex — Agent Registry

> **Master registry of all agents in the Karnex platform.** Complete specifications for every agent across all 5 layers.

---

## Registry Overview

| # | Agent ID | Layer | MVP? | Status |
|---|----------|-------|------|--------|
| 1 | `pain-transformer-v1` | Dream Engine | ✅ | Phase 1 |
| 2 | `idea-crystallizer-v1` | Dream Engine | ✅ | Phase 1 |
| 3 | `trend-radar-v1` | Dream Engine | ❌ | v2 |
| 4 | `competitive-landscape-v1` | Dream Engine | ✅ | Phase 1 |
| 5 | `icp-definer-v1` | Dream Engine | ✅ | Phase 1 |
| 6 | `war-room-v1` | Architect | ✅ | Phase 1 |
| 7 | `sprint-planner-v1` | Architect | ✅ | Phase 1 |
| 8 | `decision-journal-v1` | Architect | ❌ | v2 |
| 9 | `milestone-tracker-v1` | Architect | ❌ | v2 |
| 10 | `risk-radar-v1` | Architect | ❌ | v2 |
| 11 | `builder-v1` | Executor Pack | ✅ | Phase 2 |
| 12 | `research-v1` | Executor Pack | ✅ | Phase 2 |
| 13 | `outreach-v1` | Executor Pack | ✅ | Phase 2 |
| 14 | `content-seo-v1` | Executor Pack | ❌ | v2 |
| 15 | `sales-v1` | Executor Pack | ❌ | v2 |
| 16 | `design-v1` | Executor Pack | ❌ | v2 |
| 17 | `financial-modeling-v1` | Executor Pack | ❌ | v2 |
| 18 | `legal-compliance-v1` | Executor Pack | ❌ | v2 |
| 19 | `fundraising-v1` | Executor Pack | ❌ | v2 |
| 20 | `analytics-insight-v1` | Executor Pack | ✅ | Phase 3 |
| 21 | `daily-standup-v1` | Compass | ✅ | Phase 3 |
| 22 | `weekly-debrief-v1` | Compass | ✅ | Phase 3 |
| 23 | `momentum-score-v1` | Compass | ✅ | Phase 3 |
| 24 | `accountability-v1` | Compass | ❌ | v2 |
| 25 | `mirror-v1` | Compass | ❌ | v2 |
| 26 | `knowledge-graph-v1` | Compass | ❌ | v2 |
| 27 | `mentor-library-v1` | Compass | ❌ | v2 |

---

## Layer 1: Dream Engine

---

### Agent: `pain-transformer-v1`

| Field | Value |
|-------|-------|
| **Name** | Pain-to-Product Transformer |
| **Layer** | 1 — Dream Engine |
| **Trigger** | User action: founder submits a pain description via Idea Studio UI |
| **LLM Model** | Gemini 2.5 Pro (complex reasoning needed for hypothesis generation) |
| **Temperature** | 0.8 (creative diversity in hypotheses) |
| **Typical Execution Time** | 8–15 seconds |

**Inputs:**
```typescript
interface PainTransformerInput {
  pain_description: string;      // 10-5000 chars, founder's raw frustration
  industry_context?: string;     // Optional: "B2B SaaS", "Healthcare", etc.
  existing_solutions?: string[]; // Optional: solutions founder has tried
  founder_id: string;            // Auto-injected
}
```

**Outputs:**
```typescript
interface PainTransformerOutput {
  hypotheses: ProductHypothesis[]; // Always exactly 3 hypotheses
  pain_analysis: {
    core_pain: string;           // Distilled pain statement
    pain_intensity: number;      // 0-100
    affected_audience: string;   // Who else feels this pain
    frequency: string;           // "daily" | "weekly" | "monthly" | "situational"
  };
  recommended_hypothesis: number; // Index of best hypothesis (0-2)
}

interface ProductHypothesis {
  title: string;                 // Short product name idea
  problem_statement: string;     // Structured problem framing
  proposed_solution: string;     // How this solves the problem
  target_audience: string;       // Who this is for
  market_size_estimate: string;  // "Small niche" | "Growing market" | "Large market"
  pain_intensity_score: number;  // 0-100
  market_size_score: number;     // 0-100
  buildability_score: number;    // 0-100
  overall_score: number;         // Weighted average
  key_risks: string[];           // Top 3 risks
  next_steps: string[];          // Top 3 validation steps
}
```

**System Prompt Summary:**
- Force problem-first thinking; reject solution-first inputs by reframing
- Generate exactly 3 distinct hypotheses from different angles
- Score each hypothesis objectively on pain intensity, market size, and buildability
- Include specific, actionable next steps for validation
- Reference real market data where possible

**Tools/Functions:**
- `web_search` — Search for market data, competitor information
- `karnex_memory_read` — Read founder's existing context
- `karnex_memory_write` — Store hypotheses in memory

**Integrations:** None external (web search only)

**Failure Modes:**
| Failure | Fallback |
|---------|----------|
| Pain description too vague (< 10 chars) | Return error asking for more detail with examples |
| LLM returns malformed JSON | Retry with structured output enforcement (max 2 retries) |
| Web search fails | Generate hypotheses without market data, flag as lower confidence |

**Dependencies:** None (root agent). Hands off to → `idea-crystallizer-v1`

---

### Agent: `idea-crystallizer-v1`

| Field | Value |
|-------|-------|
| **Name** | Idea Crystallizer |
| **Layer** | 1 — Dream Engine |
| **Trigger** | Agent handoff from `pain-transformer-v1` after founder selects a hypothesis, OR user action |
| **LLM Model** | Gemini 2.5 Pro |
| **Temperature** | 0.7 |
| **Typical Execution Time** | 10–20 seconds |

**Inputs:**
```typescript
interface IdeaCrystallizerInput {
  selected_hypothesis: ProductHypothesis; // From pain-transformer
  founder_preferences?: {
    tech_preference?: string;    // "no-code" | "low-code" | "full-code"
    budget_range?: string;       // "bootstrapped" | "small-budget" | "funded"
    timeline?: string;           // "fast-launch" | "thorough"
  };
  additional_context?: string;   // Founder's additional thoughts
}
```

**Outputs:**
```typescript
interface IdeaCrystallizerOutput {
  product_brief: {
    name_candidates: string[];   // 3-5 product name ideas
    selected_name: string;       // AI's recommended name
    tagline: string;             // One-liner value prop
    elevator_pitch: string;      // 2-3 sentence pitch
    value_proposition: {
      for_whom: string;
      problem: string;
      solution: string;
      key_benefit: string;
      unlike: string;            // Competitive differentiation
    };
    features: {
      must_have: Feature[];      // Core features (3-5)
      nice_to_have: Feature[];   // Secondary features (3-5)
      future: Feature[];         // Roadmap features (3-5)
    };
    pricing_hypothesis: {
      model: string;             // "subscription" | "freemium" | "one-time" | "usage-based"
      tiers: PricingTier[];
      rationale: string;
    };
    go_to_market: string[];      // Top 3 channels to reach ICP
  };
}
```

**System Prompt Summary:**
- Produce creative but market-grounded naming suggestions
- Create a "one-sentence pitch" that passes the mom test (a non-expert understands it)
- Map every must-have feature directly to a user pain point
- Base pricing on competitive landscape and willingness-to-pay signals
- Be specific about go-to-market channels with actionable first steps

**Tools/Functions:**
- `web_search` — Competition and pricing research
- `karnex_memory_read` — Read founder's existing context and hypothesis
- `karnex_memory_write` — Store product brief in memory

**Integrations:** None external

**Failure Modes:**
| Failure | Fallback |
|---------|----------|
| Hypothesis lacks detail | Use web search to enrich before processing |
| Naming conflicts (taken domain) | Flag name availability as unchecked, suggest alternatives |

**Dependencies:** `pain-transformer-v1` → this → `icp-definer-v1`

---

### Agent: `trend-radar-v1`

| Field | Value |
|-------|-------|
| **Name** | Trend Radar |
| **Layer** | 1 — Dream Engine |
| **Trigger** | Schedule (weekly) OR user action OR agent handoff |
| **LLM Model** | Gemini 2.0 Flash (speed over depth for trend scanning) |
| **Temperature** | 0.5 |
| **Typical Execution Time** | 15–25 seconds |
| **MVP Status** | ❌ Deferred to v2 |

**Inputs:**
```typescript
interface TrendRadarInput {
  industry_keywords: string[];   // ["SaaS", "AI", "developer tools"]
  product_category: string;      // "project management", "analytics", etc.
  known_competitors?: string[];  // Optional competitor names to track
}
```

**Outputs:**
```typescript
interface TrendRadarOutput {
  trends: Trend[];               // Top 5 relevant trends
  overall_sentiment: string;     // "bullish" | "cautious" | "bearish"
  recommendation: string;        // How trends affect the founder's product
}

interface Trend {
  title: string;
  description: string;
  evidence: string[];            // Supporting data points with sources
  relevance_score: number;       // 0-100
  opportunity_or_risk: "opportunity" | "risk" | "neutral";
  implication: string;           // What this means for the founder's product
}
```

**System Prompt Summary:**
- Distinguish hype from substance using evidence quality
- Rank trends by relevance to the founder's specific product/market
- Include at least 2 data points per trend (sources required)
- Assess both opportunities and risks from each trend
- Output actionable implications, not just observations

**Tools/Functions:** `web_search`, `karnex_memory_read`, `karnex_memory_write`

**Failure Modes:** If web search returns sparse results, reduce to top 3 trends and flag low confidence.

**Dependencies:** None. Used by `competitive-landscape-v1` and `risk-radar-v1`.

---

### Agent: `competitive-landscape-v1`

| Field | Value |
|-------|-------|
| **Name** | Competitive Landscape Agent |
| **Layer** | 1 — Dream Engine |
| **Trigger** | Agent handoff from `idea-crystallizer-v1` OR user action |
| **LLM Model** | Gemini 2.5 Pro |
| **Temperature** | 0.4 (analytical, factual) |
| **Typical Execution Time** | 15–30 seconds |

**Inputs:**
```typescript
interface CompetitiveLandscapeInput {
  product_category: string;
  key_features: string[];
  target_audience: string;
  known_competitors?: string[];
}
```

**Outputs:**
```typescript
interface CompetitiveLandscapeOutput {
  competitors: Competitor[];     // 5-10 competitors
  competitive_matrix: {
    features: string[];          // Column headers
    rows: CompetitorRow[];       // Feature presence per competitor
  };
  gaps: string[];                // Unserved needs identified
  positioning_recommendations: string[];
  pricing_intelligence: {
    range_low: number;
    range_high: number;
    median: number;
    pricing_model_distribution: Record<string, number>; // {"subscription": 70, "freemium": 20, ...}
  };
}

interface Competitor {
  name: string;
  url: string;
  category: "direct" | "indirect" | "potential";
  description: string;
  key_strengths: string[];
  key_weaknesses: string[];
  pricing: string;
  estimated_users: string;       // "1K-10K", "10K-100K", etc.
}
```

**System Prompt Summary:**
- Categorize competitors as direct, indirect, and potential
- Be factual — use observable data, not speculation
- Identify blue ocean opportunities where no competitor excels
- Include pricing intelligence with specific numbers
- Produce a feature matrix that highlights the founder's differentiators

**Tools/Functions:** `web_search`, `karnex_memory_read`, `karnex_memory_write`

**Dependencies:** Product brief from `idea-crystallizer-v1`. Used by `icp-definer-v1`.

---

### Agent: `icp-definer-v1`

| Field | Value |
|-------|-------|
| **Name** | ICP Definer |
| **Layer** | 1 — Dream Engine |
| **Trigger** | Agent handoff from `idea-crystallizer-v1` OR user action |
| **LLM Model** | Gemini 2.5 Pro |
| **Temperature** | 0.7 (creative personas) |
| **Typical Execution Time** | 10–18 seconds |

**Inputs:**
```typescript
interface ICPDefinerInput {
  product_brief: ProductBrief;   // From idea-crystallizer
  competitive_landscape?: CompetitiveLandscapeOutput;
  founder_intuition?: string;    // Free-text: founder's sense of who the audience is
}
```

**Outputs:**
```typescript
interface ICPDefinerOutput {
  icp: {
    demographic: {
      age_range: string;
      location: string[];
      job_titles: string[];
      company_size: string;
      income_range: string;
    };
    psychographic: {
      motivations: string[];
      frustrations: string[];
      values: string[];
      information_sources: string[];
      decision_making_style: string;
    };
    behavioral: {
      buying_triggers: string[];
      objections: string[];
      preferred_channels: string[];
      willingness_to_pay: string;
      tool_stack: string[];       // Tools they currently use
    };
    pain_ranking: PainPoint[];    // Ranked by intensity
    day_in_the_life: string;     // Narrative: a typical day
  };
  personas: Persona[];           // Exactly 3 personas
}

interface Persona {
  name: string;                  // Fictional name
  age: number;
  location: string;
  job_title: string;
  bio: string;                   // 2-3 sentence background
  primary_pain: string;
  quote: string;                 // "In their own words" quote
  willingness_to_pay: string;
  karnex_agents_needed: string[]; // Which Karnex agents they'd use most
}
```

**System Prompt Summary:**
- Challenge the founder's assumptions about their audience
- Produce personas with enough detail to write marketing copy directly
- Map each pain point to a specific product feature 1:1
- Include realistic "willingness to pay" based on competitor pricing and audience budget
- Generate a "day in the life" narrative that makes the audience vivid and real

**Tools/Functions:** `web_search`, `karnex_memory_read`, `karnex_memory_write`

**Dependencies:** `idea-crystallizer-v1` → this. Hands off to → `war-room-v1`.

---

## Layer 2: The Architect

---

### Agent: `war-room-v1`

| Field | Value |
|-------|-------|
| **Name** | 90-Day War Room |
| **Layer** | 2 — The Architect |
| **Trigger** | Agent handoff from Dream Engine chain completion OR user action |
| **LLM Model** | Gemini 2.5 Pro |
| **Temperature** | 0.5 (structured planning) |
| **Typical Execution Time** | 12–25 seconds |

**Inputs:**
```typescript
interface WarRoomInput {
  product_brief: ProductBrief;
  icp_document: ICPDefinerOutput;
  founder_capacity: {
    weekly_hours: number;
    technical_level: string;
    budget_monthly: number;
  };
  start_date?: string;           // ISO date, defaults to today
}
```

**Outputs:**
```typescript
interface WarRoomOutput {
  roadmap: {
    title: string;
    total_days: 90;
    start_date: string;
    phases: Phase[];
  };
}

interface Phase {
  phase_number: 1 | 2 | 3;
  title: string;
  start_day: number;
  end_day: number;
  theme: string;                 // "Validation" | "Building" | "Launching"
  weekly_goals: WeeklyGoal[];
  milestones: Milestone[];
  success_criteria: string[];
  go_no_go_gate: string;        // Decision criteria to proceed to next phase
  key_risks: string[];
  agents_to_use: string[];      // Agent IDs recommended for this phase
}

interface WeeklyGoal {
  week_number: number;
  focus: string;
  goals: string[];               // 3-5 specific goals
  estimated_hours: number;
}

interface Milestone {
  title: string;
  target_week: number;
  metric: string;
  target_value: number | string;
}
```

**System Prompt Summary:**
- Adapt the plan to the founder's actual capacity (hours/week, skill level, budget)
- Include sustainability buffers — never plan > 80% of stated capacity
- Build in go/no-go gates between phases to prevent sunk cost fallacy
- Assign specific Karnex agents to each phase's tasks
- Include key risks per phase with mitigation suggestions

**Tools/Functions:** `karnex_memory_read`, `karnex_memory_write`

**Dependencies:** Dream Engine outputs → this → `sprint-planner-v1`

---

### Agent: `sprint-planner-v1`

| Field | Value |
|-------|-------|
| **Name** | Sprint Planner |
| **Layer** | 2 — The Architect |
| **Trigger** | Agent handoff from `war-room-v1`, schedule (weekly), or user action |
| **LLM Model** | Gemini 2.0 Flash (fast, frequent operation) |
| **Temperature** | 0.4 |
| **Typical Execution Time** | 5–10 seconds |

**Inputs:**
```typescript
interface SprintPlannerInput {
  roadmap_phase: Phase;          // Current phase from War Room
  week_number: number;
  founder_capacity_this_week: number; // Hours available
  blockers?: string[];           // From Daily Standup
  completed_last_week?: string[]; // Tasks completed in previous sprint
  deferred_tasks?: string[];     // Tasks deferred from previous sprints
}
```

**Outputs:**
```typescript
interface SprintPlannerOutput {
  sprint: {
    week_number: number;
    title: string;
    focus_area: string;
    tasks: SprintTask[];         // Max 7 tasks
    total_estimated_hours: number;
    stretch_goal?: string;       // If capacity allows
  };
}

interface SprintTask {
  title: string;
  description: string;
  category: "build" | "research" | "outreach" | "content" | "design" | "finance" | "other";
  estimated_hours: number;
  priority: 1 | 2 | 3 | 4 | 5;
  definition_of_done: string;
  can_delegate_to_agent?: string; // Agent ID if this can be automated
  dependencies?: string[];       // Other tasks this depends on
}
```

**System Prompt Summary:**
- Never assign more work than the founder's stated capacity allows
- Prioritize ruthlessly: max 7 tasks per sprint, ordered by impact
- Flag tasks repeatedly deferred from previous sprints
- Include clear "definition of done" for each task
- Suggest which tasks can be delegated to Karnex agents

**Tools/Functions:** `karnex_memory_read`, `karnex_memory_write`

**Dependencies:** `war-room-v1` → this. Used by `daily-standup-v1`.

---

### Agent: `decision-journal-v1`

| Field | Value |
|-------|-------|
| **Name** | Decision Journal |
| **Layer** | 2 — The Architect |
| **Trigger** | User action OR prompted by other agents at key decision points |
| **LLM Model** | Gemini 2.0 Flash |
| **Temperature** | 0.3 (analytical) |
| **Typical Execution Time** | 3–8 seconds |
| **MVP Status** | ❌ Deferred to v2 |

**Inputs:**
```typescript
interface DecisionJournalInput {
  decision_description: string;
  alternatives_considered?: string[];
  rationale?: string;
  context?: string;
}
```

**Outputs:**
```typescript
interface DecisionJournalOutput {
  decision_record: {
    title: string;
    structured_description: string;
    alternatives: { option: string; pros: string[]; cons: string[] }[];
    rationale: string;
    reversibility: "easily_reversible" | "hard_to_reverse" | "irreversible";
    confidence: "low" | "medium" | "high";
    expected_outcome: string;
    review_date: string;         // When to check if outcome matched
    related_decisions: string[]; // Links to past decisions
    bias_warnings: string[];     // Cognitive biases detected
  };
}
```

**Dependencies:** Used by `weekly-debrief-v1` and `mirror-v1`.

---

### Agent: `milestone-tracker-v1`

| Field | Value |
|-------|-------|
| **Name** | Milestone Tracker |
| **Layer** | 2 — The Architect |
| **Trigger** | Schedule (daily check) OR event (task completed) |
| **LLM Model** | Gemini 2.0 Flash |
| **Temperature** | 0.2 (factual tracking) |
| **Typical Execution Time** | 3–5 seconds |
| **MVP Status** | ❌ Deferred to v2 |

**Inputs:** Roadmap, sprint data, task completion data, analytics metrics.

**Outputs:** Progress report with milestone status, velocity trend, predicted dates, recommended actions.

**Dependencies:** `war-room-v1`, `sprint-planner-v1`, `analytics-insight-v1`.

---

### Agent: `risk-radar-v1`

| Field | Value |
|-------|-------|
| **Name** | Risk Radar |
| **Layer** | 2 — The Architect |
| **Trigger** | Schedule (weekly) OR at phase go/no-go gates |
| **LLM Model** | Gemini 2.5 Pro |
| **Temperature** | 0.4 |
| **Typical Execution Time** | 10–20 seconds |
| **MVP Status** | ❌ Deferred to v2 |

**Inputs:** Roadmap state, trend data, financial data, founder behavior patterns.

**Outputs:** Risk register with probability × impact scoring, mitigation strategies, trigger conditions.

**Dependencies:** `trend-radar-v1`, `financial-modeling-v1`, `milestone-tracker-v1`.

---

## Layer 3: Executor Pack

---

### Agent: `builder-v1`

| Field | Value |
|-------|-------|
| **Name** | Builder Agent |
| **Layer** | 3 — Executor Pack |
| **Trigger** | User action from Agent Hub OR agent handoff from Sprint Planner |
| **LLM Model** | Gemini 2.5 Pro (complex code generation) |
| **Temperature** | 0.3 (precise code output) |
| **Typical Execution Time** | 30–120 seconds |

**Inputs:**
```typescript
interface BuilderInput {
  task_type: "landing_page" | "auth_setup" | "payment_integration" | "dashboard" | "api_endpoint" | "custom";
  specification: string;         // Feature spec from sprint planner or founder
  tech_stack?: {
    framework: string;           // Default: "nextjs"
    styling: string;             // Default: "tailwind"
    database: string;            // Default: "supabase"
  };
  existing_codebase_context?: string; // Summary of existing code
  design_references?: string[];  // URLs or descriptions
  github_repo?: string;          // Repo to push to (optional)
}
```

**Outputs:**
```typescript
interface BuilderOutput {
  files: GeneratedFile[];
  summary: string;               // What was built and why
  setup_instructions: string[];  // How to run/deploy
  tests_included: boolean;
  deployment_ready: boolean;
  suggested_improvements: string[]; // What could be enhanced
}

interface GeneratedFile {
  path: string;                  // Relative file path
  content: string;               // Full file content
  language: string;              // "typescript", "css", "sql", etc.
  description: string;           // What this file does
}
```

**System Prompt Summary:**
- Generate complete, production-ready code — not snippets or pseudocode
- Follow the Karnex project coding standards (TypeScript strict, named exports, etc.)
- Include inline comments explaining non-obvious decisions
- Generate tests for critical business logic
- NEVER push to `main` without founder approval — always use feature branches
- Include setup instructions for running locally

**Tools/Functions:**
- `code_generator` — Structured code generation
- `github_create_branch` — Create feature branch
- `github_push_files` — Push generated files to repo
- `github_create_pr` — Create pull request for review
- `karnex_memory_read` — Read product context and existing code structure
- `karnex_memory_write` — Store code artifacts in memory

**Integrations:** GitHub API, Vercel (deployment triggers), Supabase (migrations)

**Failure Modes:**
| Failure | Fallback |
|---------|----------|
| Code generation produces syntax errors | Self-repair: run linter, fix errors, retry |
| GitHub push fails (auth, rate limit) | Save files locally, notify founder, queue for retry |
| Generated code too large for single output | Split into multiple files, generate incrementally |
| Spec too vague | Ask founder for clarification (TIER 3: STOP) |

**Dependencies:** Sprint Planner tasks, Design Agent references (v2). Hands off to → GitHub deployment.

---

### Agent: `research-v1`

| Field | Value |
|-------|-------|
| **Name** | Research Agent |
| **Layer** | 3 — Executor Pack |
| **Trigger** | User action OR agent handoff from Sprint Planner |
| **LLM Model** | Gemini 2.5 Pro (deep analysis) |
| **Temperature** | 0.4 |
| **Typical Execution Time** | 15–45 seconds |

**Inputs:**
```typescript
interface ResearchInput {
  research_question: string;     // Clear research question
  scope?: "market" | "competitor" | "technology" | "audience" | "general";
  depth?: "quick" | "standard" | "deep";
  preferred_sources?: string[];
  constraints?: string;          // "Focus on B2B SaaS only"
}
```

**Outputs:**
```typescript
interface ResearchOutput {
  research_brief: {
    executive_summary: string;   // 2-3 sentence summary
    key_findings: Finding[];
    data_tables?: DataTable[];
    implications: string[];      // What this means for the founder
    recommended_actions: string[];
    confidence: "low" | "medium" | "high";
    sources: Source[];
    gaps: string[];              // What couldn't be found
  };
}

interface Finding {
  title: string;
  description: string;
  supporting_evidence: string[];
  source_urls: string[];
  confidence: "low" | "medium" | "high";
}
```

**System Prompt Summary:**
- Distinguish primary sources from opinions — prioritize data over anecdotes
- Flag contradictory findings explicitly rather than picking a side
- Include at least 3 source citations per key finding
- Assess confidence per finding, not just overall
- Produce actionable implications, not just facts

**Tools/Functions:** `web_search`, `karnex_memory_read`, `karnex_memory_write`

**Dependencies:** None. Used by many agents. Hands off to → context-dependent.

---

### Agent: `outreach-v1`

| Field | Value |
|-------|-------|
| **Name** | Outreach Agent |
| **Layer** | 3 — Executor Pack |
| **Trigger** | User action from Agent Hub |
| **LLM Model** | Gemini 2.5 Pro (personalization quality) |
| **Temperature** | 0.7 (creative, personalized messaging) |
| **Typical Execution Time** | 10–30 seconds (composition) + send time |

**Inputs:**
```typescript
interface OutreachInput {
  campaign_goal: string;         // "Get 20 beta signups", "Customer discovery interviews"
  target_audience: string;       // From ICP
  contacts: OutreachContact[];   // List of contacts to reach
  channel: "email" | "linkedin"; // MVP: email only
  tone?: "formal" | "casual" | "direct";
  sequence_length?: number;      // 1-5 messages, default 3
  reference_content?: string;    // Product brief, landing page URL
}
```

**Outputs:**
```typescript
interface OutreachOutput {
  campaign: {
    name: string;
    messages: CampaignMessage[];
    send_schedule: SendSchedule;
    personalization_notes: string;
    ab_variants?: CampaignMessage[]; // A/B test variants
  };
  requires_approval: true;       // ALWAYS true — never auto-send
}

interface CampaignMessage {
  step: number;                  // 1, 2, 3...
  delay_days: number;            // Days after previous message
  subject: string;               // With {{personalization}} tokens
  body: string;                  // With {{personalization}} tokens
  variant: "A" | "B";
}
```

**System Prompt Summary:**
- NEVER send any message without explicit founder approval — composition only
- Personalize each message using available data about the recipient
- Keep emails short (< 150 words per message)
- Include a clear, single CTA per message
- Write subject lines that are specific, not spammy
- Suggest A/B testing variants for subject lines

**Tools/Functions:**
- `web_search` — Research individual contacts
- `gmail_compose` — Compose email drafts (REQUIRES APPROVAL before send)
- `karnex_memory_read` — Product context, ICP
- `karnex_memory_write` — Store campaign data

**Integrations:** Gmail API (OAuth, sending), Resend (transactional)

**Failure Modes:**
| Failure | Fallback |
|---------|----------|
| Contact has no email | Skip contact, flag as incomplete |
| Gmail OAuth expired | Notify founder to re-authorize, queue campaign |
| Rate limit hit | Throttle sending, extend campaign timeline |

**Dependencies:** ICP from `icp-definer-v1`. Uses `research-v1` for contact research.

**MVP v1 Limitations:**
1. **Mock Draft Queue**: Rather than direct Gmail sending, campaigns are pushed into a mock draft delivery queue visible inside the frontend. This simulates delivery without requiring Google-verified API access.
2. **Gmail API OAuth v2 Mock**: The "Connect Gmail to send" CTA initiates a simulated consent dialog rather than authenticating against real production credentials.

---

### Agent: `content-seo-v1`

| Field | Value |
|-------|-------|
| **Name** | Content & SEO Agent |
| **Layer** | 3 — Executor Pack |
| **MVP Status** | ❌ Deferred to v2 |
| **LLM Model** | Gemini 2.5 Pro |
| **Temperature** | 0.7 |
| **Typical Execution Time** | 15–45 seconds |

**Inputs:** Content type, topic, target keywords, brand voice guidelines, product context.

**Outputs:** Ready-to-publish content (blog post, landing page copy, social media), keyword strategy, meta descriptions.

**Dependencies:** Product brief, ICP, competitive landscape.

---

### Agent: `sales-v1`

| Field | Value |
|-------|-------|
| **Name** | Sales Agent |
| **Layer** | 3 — Executor Pack |
| **MVP Status** | ❌ Deferred to v2 |
| **LLM Model** | Gemini 2.5 Pro |
| **Temperature** | 0.6 |

**Outputs:** Sales scripts, demo flows, objection handlers, pricing negotiation frameworks.

---

### Agent: `design-v1`

| Field | Value |
|-------|-------|
| **Name** | Design Agent |
| **Layer** | 3 — Executor Pack |
| **MVP Status** | ❌ Deferred to v2 |
| **LLM Model** | Gemini 2.5 Pro (multimodal) |
| **Temperature** | 0.8 |

**Outputs:** UI mockups, brand guidelines, component specs, design system documentation.

---

### Agent: `financial-modeling-v1`

| Field | Value |
|-------|-------|
| **Name** | Financial Modeling Agent |
| **Layer** | 3 — Executor Pack |
| **MVP Status** | ❌ Deferred to v2 |
| **LLM Model** | Gemini 2.5 Pro |
| **Temperature** | 0.2 (precise calculations) |

**Outputs:** Revenue projections, unit economics, burn rate, break-even analysis, scenario modeling.

---

### Agent: `legal-compliance-v1`

| Field | Value |
|-------|-------|
| **Name** | Legal & Compliance Agent |
| **Layer** | 3 — Executor Pack |
| **MVP Status** | ❌ Deferred to v2 |
| **LLM Model** | Gemini 2.5 Pro |
| **Temperature** | 0.1 (precise, conservative) |

**Outputs:** ToS, Privacy Policy, Cookie Policy, DPA templates, regulatory checklists. Always disclaims: not legal advice.

---

### Agent: `fundraising-v1`

| Field | Value |
|-------|-------|
| **Name** | Fundraising Agent |
| **Layer** | 3 — Executor Pack |
| **MVP Status** | ❌ Deferred to v2 |
| **LLM Model** | Gemini 2.5 Pro |
| **Temperature** | 0.6 |

**Outputs:** Pitch deck content, executive summary, investor target list, due diligence prep.

---

### Agent: `analytics-insight-v1`

| Field | Value |
|-------|-------|
| **Name** | Analytics & Insight Agent |
| **Layer** | 3 — Executor Pack |
| **Trigger** | Schedule (weekly) OR user action |
| **LLM Model** | Gemini 2.0 Flash |
| **Temperature** | 0.3 |
| **Typical Execution Time** | 8–15 seconds |

**Inputs:**
```typescript
interface AnalyticsInput {
  # [v2 - deferred] Stripe - not in v1
  data_source: "posthog" | "stripe [v2 - deferred]" | "karnex_internal";
  time_range: "7d" | "14d" | "30d" | "90d";
  focus_area?: "growth" | "engagement" | "revenue" | "conversion" | "all";
}
```

**Outputs:**
```typescript
interface AnalyticsOutput {
  insights: {
    metrics_summary: MetricSummary[];
    anomalies: Anomaly[];
    recommendations: string[];   // Actionable next steps
    so_what: string;             // "So what does this mean for you?"
  };
}
```

**System Prompt Summary:**
- Distinguish vanity metrics from actionable metrics
- Highlight anomalies automatically
- Produce "so what?" analysis, not just numbers
- Tie every insight to a recommended action

**Tools/Functions:** `posthog_query`, `stripe [v2 - deferred]_metrics`, `karnex_memory_read`, `karnex_memory_write`

**Integrations:** PostHog API, Stripe [v2 - deferred] API

**Dependencies:** PostHog integration, Stripe [v2 - deferred] integration.

---

## Layer 4: The Compass

---

### Agent: `daily-standup-v1`

| Field | Value |
|-------|-------|
| **Name** | Daily Standup |
| **Layer** | 4 — The Compass |
| **Trigger** | Schedule (daily at founder's preferred time) OR user action |
| **LLM Model** | Gemini 2.0 Flash (speed is critical — < 3 min experience) |
| **Temperature** | 0.5 |
| **Typical Execution Time** | 3–8 seconds |

**Inputs:**
```typescript
interface DailyStandupInput {
  founder_update: string;        // Free-text: "Finished the landing page, stuck on auth"
  yesterday_tasks?: string[];    // Auto-populated from sprint
  today_sprint_tasks?: string[];
}
```

**Outputs:**
```typescript
interface DailyStandupOutput {
  standup_summary: {
    yesterday_completed: string[];
    today_priorities: string[];  // Max 3
    blockers_identified: string[];
    momentum_delta: number;      // Change in momentum score
    encouragement: string;       // Brief motivational note
    blocker_suggestions?: string[]; // How to unblock
  };
}
```

**System Prompt Summary:**
- Keep response under 200 words — respect the "3 minutes" promise
- Celebrate completed tasks genuinely (not performatively)
- Identify blockers from the update and suggest solutions
- Update sprint task statuses based on the update
- Never lecture or add unnecessary process

**Tools/Functions:** `karnex_memory_read`, `karnex_memory_write`, `update_task_status`

**Dependencies:** `sprint-planner-v1` (for current tasks). Feeds into → `momentum-score-v1`.

---

### Agent: `weekly-debrief-v1`

| Field | Value |
|-------|-------|
| **Name** | Weekly Debrief |
| **Layer** | 4 — The Compass |
| **Trigger** | Schedule (weekly, end of sprint) OR user action |
| **LLM Model** | Gemini 2.5 Pro (thorough analysis) |
| **Temperature** | 0.5 |
| **Typical Execution Time** | 10–20 seconds |

**Inputs:**
```typescript
interface WeeklyDebriefInput {
  sprint_data: SprintWithTasks;  // Current sprint + task statuses
  standup_summaries: StandupSummary[]; // Week's daily standups
  agent_runs_this_week: AgentRunSummary[];
  metrics?: MetricSummary[];     // From analytics agent if available
}
```

**Outputs:**
```typescript
interface WeeklyDebriefOutput {
  debrief: {
    achievements: string[];      // What was accomplished
    missed_targets: { target: string; root_cause: string }[];
    key_learnings: string[];
    next_week_focus: string[];   // Top 3 priorities
    roadmap_adjustment?: string; // Suggested roadmap change
    momentum_trend: "rising" | "steady" | "falling";
    overall_assessment: string;  // Honest but encouraging summary
  };
}
```

**Dependencies:** `daily-standup-v1`, `sprint-planner-v1`, `analytics-insight-v1`.

---

### Agent: `momentum-score-v1`

| Field | Value |
|-------|-------|
| **Name** | Momentum Score |
| **Layer** | 4 — The Compass |
| **Trigger** | Event (task completed, standup done, agent run) OR schedule (hourly recalculation) |
| **LLM Model** | None — pure calculation (no LLM needed) |
| **Typical Execution Time** | < 1 second |

**Inputs:**
```typescript
interface MomentumScoreInput {
  tasks_completed_7d: number;
  tasks_total_7d: number;
  streak_days: number;
  agents_used_7d: number;
  standup_consistency_7d: number; // 0-7 (standups completed this week)
  revenue_progress?: number;     // 0-100 (if applicable)
}
```

**Outputs:**
```typescript
interface MomentumScoreOutput {
  score: number;                 // 0-100
  breakdown: {
    task_completion: number;     // 0-25 points
    consistency: number;         // 0-25 points (streak + standup)
    agent_utilization: number;   // 0-25 points
    progress: number;            // 0-25 points (milestone/revenue progress)
  };
  trend: "rising" | "steady" | "falling";
  message: string;               // Contextual encouragement/warning
}
```

**Dependencies:** `daily-standup-v1`, task data. Triggers → `accountability-v1` when score < 30 for 3+ days.

---

### Agent: `accountability-v1`

| Field | Value |
|-------|-------|
| **Name** | Accountability Mode |
| **Layer** | 4 — The Compass |
| **Trigger** | Automatic when Momentum Score < 30 for 3+ days OR founder inactive 3+ days |
| **LLM Model** | Gemini 2.0 Flash |
| **Temperature** | 0.6 |
| **MVP Status** | ❌ Deferred to v2 |

**Outputs:** Proactive nudge messages via email/push. Gentle → firm escalation. Always includes a concrete "restart task" < 15 minutes.

---

### Agent: `mirror-v1`

| Field | Value |
|-------|-------|
| **Name** | Mirror Agent |
| **Layer** | 4 — The Compass |
| **Trigger** | User action OR automatic at key decision points (pivots, large time investments) |
| **LLM Model** | Gemini 2.5 Pro |
| **Temperature** | 0.6 |
| **MVP Status** | ❌ Deferred to v2 |

**Outputs:** Counter-arguments, alternative perspectives, bias identification, "steel man" against founder's position.

---

### Agent: `knowledge-graph-v1`

| Field | Value |
|-------|-------|
| **Name** | Founder Knowledge Graph |
| **Layer** | 4 — The Compass |
| **Trigger** | Automatic after every agent run (extract + index entities) |
| **LLM Model** | Gemini 2.0 Flash (entity extraction) |
| **MVP Status** | ❌ Deferred to v2 (Karnex Memory v1 key-value is sufficient) |

**Outputs:** Queryable knowledge graph of entities (people, companies, decisions, features, metrics) with relationships.

---

### Agent: `mentor-library-v1`

| Field | Value |
|-------|-------|
| **Name** | Mentor Library |
| **Layer** | 4 — The Compass |
| **Trigger** | User query OR contextual injection by other agents |
| **LLM Model** | Gemini 2.0 Flash |
| **Temperature** | 0.5 |
| **MVP Status** | ❌ Deferred to v2 |

**Outputs:** Contextual startup wisdom from frameworks (Lean Startup, Mom Test, JTBD), matched to founder's situation.

---

*Last updated: 2026-05-28 | Version: 1.0.0*
