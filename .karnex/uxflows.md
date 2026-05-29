# Karnex — UX Flows

> **Full UX and product flow documentation.** Every user journey, screen, and state defined.

---

## Core User Flows

### Flow 1: First-Time Onboarding (Account Creation → First Roadmap)

```
1. LANDING PAGE
   └─ Founder clicks "Get Started" or "Start Free Trial"

2. SIGNUP
   ├─ Option A: Email + password
   └─ Option B: Google OAuth (one-click)
   → Supabase Auth creates user
   → Create `founders` record with defaults

3. WELCOME SCREEN
   └─ "Welcome to Karnex. Let's turn your idea into reality."
   └─ Single CTA: "Let's go" (no tutorial, no tour — action first)

4. FOUNDER PROFILE (3 questions)
   ├─ Q1: "What's your name?" → free text
   ├─ Q2: "How many hours per week can you dedicate?" → slider (5-40)
   └─ Q3: "How technical are you?" → 3 options: Beginner / Intermediate / Advanced
   → Save to `founders` table
   → CTA: "Now tell me what's keeping you up at night"

5. PAIN INPUT (Dream Engine entry)
   └─ Large text area: "Describe a frustration, pain, or problem you've experienced..."
   └─ Placeholder: "e.g., I waste 3 hours every week manually writing outreach emails because tools like Apollo are too complex and expensive for a solo founder..."
   └─ Optional: Industry context dropdown
   └─ CTA: "Transform this into a product" (triggers Pain-to-Product Transformer)

6. AGENT EXECUTION (first agent run)
   └─ Loading state: "🔍 Analyzing your pain... Finding the product opportunity..."
   └─ Progress indicators: "Analyzing pain intensity... Estimating market size... Generating hypotheses..."
   └─ Duration: ~10-15 seconds

7. HYPOTHESIS RESULTS
   └─ 3 product hypothesis cards displayed side by side
   └─ Each card shows: title, problem statement, overall score (as a ring chart), key risks
   └─ "Recommended" badge on the highest-scoring hypothesis
   └─ Founder selects one hypothesis
   └─ CTA: "Crystallize this idea" (triggers Idea Crystallizer)

8. PRODUCT BRIEF GENERATED
   └─ Full product brief displayed: name, tagline, elevator pitch, features, pricing
   └─ Editable fields (founder can tweak)
   └─ CTA: "Define my audience" (triggers ICP Definer)

9. ICP GENERATED
   └─ 3 persona cards displayed
   └─ Pain point ranking table
   └─ "Day in the life" narrative
   └─ CTA: "Build my roadmap" (triggers 90-Day War Room)

10. ROADMAP GENERATED
    └─ 3-phase visual timeline
    └─ Milestone markers
    └─ Weekly breakdown (expandable)
    └─ CTA: "Let's start Sprint 1" → Redirects to Dashboard

11. DASHBOARD (first view)
    └─ Sprint 1 tasks loaded
    └─ Momentum Score: 50 (starting baseline)
    └─ "Your first task: [highest priority task]"
    └─ Celebration: "🎉 You have a plan. Most founders never get this far. Let's execute."
```

**Total onboarding time target: < 10 minutes**

---

### Flow 2: Daily Standup

```
1. TRIGGER
   ├─ Scheduled: Push notification / email at founder's preferred time
   └─ Manual: Founder clicks "Daily Standup" in Compass sidebar

2. STANDUP INPUT
   └─ Pre-populated: "Yesterday's tasks" (from sprint, auto-checked if marked done)
   └─ Text area: "What's on your mind today?" (free-text update)
   └─ Quick-check: "Any blockers?" → Yes/No → If yes, describe

3. AGENT PROCESSING
   └─ Daily Standup agent processes update (~3-8 seconds)
   └─ Updates task statuses based on founder's input
   └─ Calculates momentum delta

4. STANDUP SUMMARY
   └─ ✅ Completed yesterday: [list]
   └─ 🎯 Today's top priorities: [2-3 tasks]
   └─ 🚧 Blockers: [if any, with suggestions]
   └─ 📈 Momentum: [score] ([trend arrow] from yesterday)
   └─ 💬 Quick note from Karnex: [brief encouragement or nudge]

5. DISMISS
   └─ CTA: "Start working" → Redirects to Dashboard
   └─ Standup saved in history (viewable in Compass → Standup History)
```

**Total standup time target: < 3 minutes**

---

### Flow 3: Triggering an Execution Agent

```
1. NAVIGATION
   └─ Founder goes to Agent Hub (sidebar)

2. AGENT SELECTION
   └─ Grid of available agents (cards with icon, name, description)
   └─ Grayed out agents: locked by subscription tier (with "Upgrade" badge)
   └─ Founder clicks an agent (e.g., "Research Agent")

3. AGENT CONFIGURATION
   └─ Agent-specific input form:
       ├─ Research Agent: research question, scope, depth
       ├─ Builder Agent: task type, specification, tech stack
       ├─ Outreach Agent: campaign goal, contacts, channel
       └─ ... (each agent has its own form)
   └─ Pre-populated fields from Karnex Memory where applicable
   └─ CTA: "Run Agent" (or "Compose Campaign" for Outreach)

4. CREDIT CHECK
   └─ If credits available: proceed
   └─ If credits exhausted: show upgrade modal
       └─ "You've used all your agent tasks this month."
       └─ "Upgrade to Builder for 500 tasks/month → $79/mo"
       └─ CTA: "Upgrade" | "Not now"

5. EXECUTION STATE
   └─ Status: QUEUED → RUNNING → SUCCESS | ERROR
   └─ Real-time progress via Supabase Realtime
   └─ Loading UI: agent-specific animation + progress steps
   └─ Duration indicator: "Usually takes 10-30 seconds"

6. RESULT DISPLAY
   ├─ SUCCESS:
   │   └─ Agent output displayed in structured format
   │   └─ Download / copy options
   │   └─ "Run again with different inputs" option
   │   └─ Suggested next agent: "Next: Try the Builder Agent to turn this research into a landing page"
   │
   └─ ERROR:
       └─ User-friendly error message
       └─ "Retry" button (for transient errors)
       └─ "Contact support" for persistent errors
       └─ Partial results shown if available

7. OUTREACH SPECIAL FLOW (requires approval)
   └─ After composition: campaign preview screen
   └─ Each message shown with personalization
   └─ "Approve & Schedule" | "Edit" | "Cancel"
   └─ Only after explicit approval does sending begin
```

---

### Flow 4: Agent Chaining (Research → Positioning → Builder)

```
1. TRIGGER
   └─ Founder initiates from Sprint Planner task or Agent Hub
   └─ Or: automatically suggested after an agent completes

2. CHAIN VISUALIZATION
   └─ Horizontal pipeline view:
       [Research Agent] → [Idea Crystallizer] → [Builder Agent]
       (each node shows status: pending / running / complete)

3. STEP 1: RESEARCH AGENT
   └─ Input: research question
   └─ Execution: 15-45 seconds
   └─ Output: research brief displayed
   └─ Auto-proceed to next step (or pause if human input needed)

4. HUMAN CHECKPOINT (if needed)
   └─ "Research is complete. Review the findings before we proceed."
   └─ Founder reviews and confirms: "Continue to Builder"

5. STEP 2: BUILDER AGENT
   └─ Input: auto-populated from research + product brief
   └─ Execution: 30-120 seconds
   └─ Output: generated code files

6. CHAIN COMPLETE
   └─ All outputs available in a combined view
   └─ Each agent's output in a tab / accordion
   └─ Overall chain summary at the top
```

---

### Flow 5: Weekly Debrief

```
1. TRIGGER
   └─ Scheduled: Friday afternoon or founder's preferred day
   └─ Notification: "Time for your weekly debrief"

2. AUTO-COLLECTED DATA
   └─ Week's standup summaries (auto)
   └─ Task completion stats (auto)
   └─ Agent runs this week (auto)
   # [v2 - deferred] Stripe - not in v1
   └─ Metrics from PostHog/Stripe [v2 - deferred] (auto, if integrated)

3. OPTIONAL FOUNDER INPUT
   └─ "Anything else you want to reflect on this week?" → free text
   └─ "Rate your energy this week" → 1-5 emoji scale

4. AGENT PROCESSING
   └─ Weekly Debrief agent runs (~10-20 seconds)

5. DEBRIEF DISPLAY
   └─ 📊 This Week's Scorecard
       ├─ Tasks completed: X/Y
       ├─ Agent tasks used: Z
       ├─ Momentum trend: [rising/steady/falling]
       └─ Sprint completion: XX%
   └─ ✅ Achievements: [bullet list]
   └─ ❌ Missed: [with root cause analysis]
   └─ 💡 Key Learnings: [insights]
   └─ 🎯 Next Week Focus: [3 priorities]
   └─ 📝 Roadmap Adjustment: [if needed]

6. CLOSE
   └─ "Have a great weekend. See you Monday for Sprint [N+1]."
   └─ Debrief saved in Compass → Weekly History
```

---

### Flow 6: Subscription Upgrade

```
1. TRIGGER
   ├─ Founder clicks "Upgrade" on pricing page
   ├─ Founder hits credit limit (shown upgrade modal)
   └─ Founder tries to access a locked agent

2. PLAN COMPARISON
   └─ Side-by-side tier comparison table
   └─ Current plan highlighted
   └─ Recommended plan highlighted (based on usage patterns)
   └─ Feature checkmarks: ✅ included / 🔒 locked

3. CHECKOUT
   # [v2 - deferred] Stripe - not in v1
   └─ Stripe [v2 - deferred] Checkout (embedded or redirect)
   └─ Payment form: card details
   └─ Plan summary: tier, price, billing cycle
   └─ CTA: "Subscribe — $79/mo"

4. CONFIRMATION
   └─ "🎉 Welcome to Karnex Builder!"
   └─ New features unlocked (highlighted)
   └─ Credits reset to new tier's allocation
   └─ CTA: "Explore your new agents"

5. DOWNGRADE / CANCEL
   └─ Settings → Billing → "Change Plan"
   └─ If downgrading: show what will be lost, confirm
   └─ If cancelling: show churn intervention
       └─ "We're sorry to see you go. Before you cancel..."
       └─ Offer: pause subscription for 1 month, switch to lower tier, talk to support
       └─ If still cancelling: "Your plan will remain active until [end of billing period]"
```

---

## Major Screens

### Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────┐                                    [🔔] [Avatar] │
│  │ KARNEX  │  Dashboard                                       │
│  └─────────┘                                                   │
├─────────┬───────────────────────────────────────────────────────┤
│         │                                                       │
│ 📊 Dash │  ┌──────────────────┐  ┌──────────────────────────┐ │
│ 💡 Ideas│  │ MOMENTUM SCORE   │  │ SPRINT 3: Build Phase    │ │
│ ⚔️ War  │  │                  │  │                          │ │
│ 🤖 Agents│ │    ╭──────╮      │  │ ☐ Deploy landing page    │ │
│ 🧭 Compass│ │   │  73  │      │  │ ☑ Set up auth flow       │ │
# [v2 - deferred] Stripe - not in v1
│ 🔒 Vault│  │    ╰──────╯      │  │ ☐ Connect Stripe [v2 - deferred]         │ │
│ ⚙️ Settings│ │ ↑ Rising        │  │ ☐ Write hero copy        │ │
│ 💳 Billing│ │                  │  │ ◉ Configure PostHog      │ │
│         │  └──────────────────┘  └──────────────────────────┘ │
│         │                                                       │
│         │  ┌──────────────────────────────────────────────────┐ │
│         │  │ RECENT AGENT ACTIVITY                            │ │
│         │  │                                                  │ │
│         │  │ ✅ Research Agent    15 min ago   "Market analysis│ │
│         │  │ ✅ Builder Agent     2 hrs ago    "Landing page"  │ │
│         │  │ 🔄 Outreach Agent   Running...                   │ │
│         │  └──────────────────────────────────────────────────┘ │
│         │                                                       │
│         │  ┌──────────────────┐  ┌──────────────────────────┐ │
│         │  │ THIS WEEK        │  │ QUICK ACTIONS            │ │
│         │  │ 4/7 tasks done   │  │                          │ │
│         │  │ 3 agents used    │  │ [▶ Daily Standup]        │ │
│         │  │ Day 47 of 90     │  │ [🤖 Run an Agent]        │ │
│         │  │ Credits: 342/500 │  │ [📝 Log a Decision]      │ │
│         │  └──────────────────┘  └──────────────────────────┘ │
└─────────┴───────────────────────────────────────────────────────┘
```

### Idea Studio (Dream Engine UI)

- **Purpose:** Where founders describe pain, view hypotheses, and refine product briefs
- **Sections:**
  - Pain input area (large textarea with examples)
  - Hypothesis cards (3-column grid, each with scores and selection button)
  - Product brief viewer/editor (tabs: Overview, Features, Pricing, ICP)
  - History: past ideas with status badges (hypothesis, exploring, validated, rejected, selected)

### War Room (Architect UI)

- **Purpose:** View and manage the 90-day roadmap
- **Sections:**
  - Timeline view: 3 phases as horizontal bands with milestone markers
  - Phase detail panel: goals, milestones, go/no-go criteria
  - Current sprint: task list with drag-to-reorder and status toggles
  - Velocity chart: tasks completed per week (line chart)

### Agent Hub (Executor UI)

- **Purpose:** Browse, configure, and trigger agents
- **Sections:**
  - Agent grid: cards with icon, name, layer badge, description
  - Locked agent overlay for gated features (with "Upgrade" CTA)
  - Agent execution panel: input form, run button, status indicator
  - Output viewer: structured output with tabs, copy/download
  - Run history: past executions with status, timestamp, link to output

### Compass (Coaching UI)

- **Purpose:** Daily standup, weekly debrief, momentum tracking
- **Sections:**
  - Momentum Score widget (large, central, with trend chart)
  - Daily Standup panel: input form and history
  - Weekly Debrief panel: latest debrief and history
  - Streak tracker: visual calendar showing active days

### Founder Vault

- **Purpose:** Secure document storage
- **Sections:**
  - Document list: name, type, created date, source agent
  - Upload button for manual document storage
  - Categories: Legal, Financial, Product, Research, Outreach
  - Search bar for quick document lookup

---

## Agent Execution State Machine

```
                    ┌────────────┐
                    │            │
     trigger ──────▶│   IDLE     │
                    │            │
                    └─────┬──────┘
                          │ founder clicks "Run Agent"
                          ▼
                    ┌────────────┐
                    │            │
                    │  QUEUED    │ ← credit check passes
                    │            │   request sent to agent service
                    └─────┬──────┘
                          │ agent service picks up
                          ▼
                    ┌────────────┐
                    │            │
                    │  RUNNING   │ ← real-time progress updates
                    │            │   via Supabase Realtime
                    └─────┬──────┘
                          │
                    ┌─────┴──────┐
                    │            │
              ┌─────▼────┐ ┌────▼─────┐
              │          │ │          │
              │ SUCCESS  │ │  ERROR   │
              │          │ │          │
              └──────────┘ └────┬─────┘
                                │
                          ┌─────┴──────┐
                          │            │
                    ┌─────▼────┐ ┌────▼──────┐
                    │ RETRYABLE│ │ PERMANENT │
                    │ (retry)  │ │ (show msg)│
                    └──────────┘ └───────────┘

UI States:
- IDLE:     Agent card with "Run" button enabled
- QUEUED:   Pulsing indicator, "Preparing..." text, button disabled
- RUNNING:  Animated progress bar, step-by-step progress messages, "Cancel" button
- SUCCESS:  Green checkmark, output displayed, "Run Again" button
- ERROR:    Red indicator, error message, "Retry" button (if retryable)
- CANCELLED:Gray indicator, "Agent run was cancelled", "Run Again" button
```

---

## Error States and Empty States

### Error States

| Screen | Error Type | Display |
|--------|-----------|---------|
| Dashboard | Failed to load sprint | "Couldn't load your sprint. [Retry] [Report Issue]" |
| Agent Hub | Agent execution failed | "Something went wrong. [View Details] [Retry]" + error message |
| Agent Hub | Credits exhausted | "You've used all your agent credits. [Upgrade Plan]" |
| Idea Studio | No hypotheses generated | "We couldn't generate hypotheses from this input. Try adding more detail about the pain." |
| War Room | Roadmap generation failed | "Roadmap generation encountered an issue. [Retry] [Manual Plan]" |
| Settings | Integration OAuth failed | "Couldn't connect to [service]. [Try Again]" |
| Billing | Payment failed | "Payment didn't go through. Please check your card. [Update Payment]" |

### Empty States

| Screen | Empty Condition | Display |
|--------|----------------|---------|
| Dashboard (first visit) | No sprint exists | "Welcome! Start by describing your pain → [Go to Idea Studio]" |
| Idea Studio | No ideas yet | Illustration + "Your first idea starts with a pain. What frustration keeps you up at night?" |
| War Room | No roadmap | "No roadmap yet. Complete the Dream Engine first. [Go to Idea Studio]" |
| Agent Hub | No past runs | "You haven't run any agents yet. Pick one to get started! [Browse Agents]" |
| Compass | No standups | "Start your first daily standup to build momentum. [Start Standup]" |
| Vault | No documents | "Your vault is empty. Documents generated by agents will appear here." |
| Outreach | No campaigns | "No outreach campaigns yet. [Create Campaign] with the Outreach Agent." |

---

## Mobile vs Desktop Considerations

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| **Layout** | Sidebar navigation + main content | Bottom tab bar + full-screen pages |
| **Agent Hub** | Grid of agent cards (3-4 columns) | Single column list |
| **Code viewer** | Side-by-side file tree + code | Stacked: file list then code |
| **Roadmap timeline** | Horizontal timeline | Vertical timeline (scrollable) |
| **Daily Standup** | Panel in dashboard | Full-screen modal |
| **Agent execution** | Inline in main content area | Full-screen with progress overlay |
| **Priority** | Desktop-first (founders work at desks) | Responsive, not optimized |

**MVP approach:** Responsive Tailwind classes ensure usability on mobile. No dedicated mobile experience. Desktop is the primary target since founders work at computers.

---

*Last updated: 2026-05-28 | Version: 1.0.0*
