# Karnex — Project Context & Architecture (v2.0.0)

> **Single Source of Truth** — Any agent, developer, or stakeholder reading this file should fully understand what Karnex is, who it's for, and how it works.

---

## Executive Summary

Karnex is a multi-agent AI platform that serves as the AI operating system for solo founders and indie hackers — collapsing the gap between raw ambition and a launched product with real revenue. 

Everything in Karnex 2.0 is designed around one truth: **the 90-day roadmap is the spine.** The founder should never think about which agent to use, which layer to navigate to, or what to type. They should only ever think about what they want to accomplish next. Every feature either feeds into the roadmap or executes from it. Nothing exists outside of it.

---

## Problem Statement

> *"I have this idea that keeps me up at night. I know it could work. But I'm one person. I can't build the product, validate the market, do customer outreach, figure out pricing, write landing page copy, set up payments, AND stay motivated — all at the same time, all alone. Every morning I open my laptop and stare at 47 open tabs, not knowing what to do first. I don't need more advice. I need someone — something — that will actually do the work WITH me."*

### The Pain in Detail

Solo founders face a **compounding execution gap**:
1.  **No co-founder**: No one to divide labor with or hold them accountable.
2.  **Too many decisions**: Staring at complex setups instead of executing the next step.
3.  **Fragmented tools**: Bouncing between separate builders, outreach trackers, and advisors.
4.  **No forcing function**: Losing momentum after initial excitement fades.

The result: **95% of solo founder projects die not from bad ideas, but from execution collapse.**

---

## The One Spine Architecture

THE ONE SPINE ARCHITECTURE:
- The 90-Day Roadmap is the spine of all user activity
- Agents are invisible workers  never navigation destinations
- Founders experience outcomes, not agent names
- Navigation: Home (Journey)  Studio  Integrations  Vault  Settings
- Dream Engine runs during onboarding and from Vault "+ New Idea"
- Compass (standup/momentum) lives inside the Journey page
- War Room tasks surface on the Journey page with one-button agent execution


---

## The 2.0 Data Model Updates

To support the "One Spine" architecture, the database model includes:

1.  **`tasks` table**:
    *   `agent_config` (JSONB): Contains pre-defined agent tasks, rules, and prompts.
    *   `agent_output` (JSONB): Stores the resulting output payload upon completion.
    *   `execute_label` (TEXT): Custom button label (e.g., *"Let Karnex build invoicing"*).
    *   `auto_executable` (BOOLEAN): Flags if the task has a pre-built execution profile.
2.  **`founders` table**:
    *   `last_journey_view` (TIMESTAMPTZ): Tracks daily login engagement.
    *   `onboarding_step` (INTEGER): Tracks progress through the 4-step onboarding wizard.
3.  **`integrations` table**:
    *   `automation_rules` (JSONB): Saved rules and recipes.

---

## Monetization Gating Model

Rather than gating features (which frustrates users), Karnex gates **autonomy** and **task limits**:

*   **Free Trial (14 days)**: 20 tasks, full agent experience.
*   **Starter ($29/mo)**: 100 tasks, manual trigger only.
*   **Builder ($79/mo)**: 500 tasks, autonomous execution, live GitHub/Gmail integrations.
*   **Founder ($149/mo)**: Unlimited tasks, background autonomous execution.
*   **Studio ($299/mo)**: Unlimited tasks, multi-project workspace, team seats.

The upgrade trigger is always: *"I ran out of tasks"* or *"I want this to run autonomously in the background."*

---

*Last updated: June 2026 | Version: 2.0.0 | Production: https://arioai.site*
