# Karnex Forge System Spec

Master reference for the Forge orchestrator, Studio UI, and OpenRouter model routing.

## Product principles

1. **Studio-first** — `/studio` is the default surface; Advanced Forge exposes file tree, model picker, and raw event log.
2. **Dual autonomy** — `founder` runs end-to-end; `developer` requires plan approval before build.
3. **Visible subagents** — Every spawn/progress/artifact emits structured `agent_runs.logs` events.
4. **OpenRouter until in-house** — All LLM calls use `services/shared/openrouter_client.py` and `models.catalog.json`.
5. **Karnex context** — Memory (product brief, ICP, roadmap) and sprint tasks inject into every run.

## Modes

| Mode | Writes code | Handler |
|------|-------------|---------|
| plan | No | `forge/modes/plan.py` |
| ask | No | `forge/modes/ask.py` |
| debug | Patches/notes | `forge/modes/debug.py` |
| build | Yes | `forge/modes/build.py` → `run_build_pipeline` |

**Auto-detect:** `forge/modes/router.py` — user can override in UI.

## Autonomy approval matrix

| Action | founder | developer |
|--------|---------|-----------|
| Plan generation | Auto-continue | Required; blocks build until `plan_approved=true` |
| Code generation | Auto | After plan approval |
| Debug patch files | Auto (notes) | `approval_required` event unless `plan_approved` |
| Git push | Feature branch only | Same |
| Deploy / spend | Confirm in UI | Explicit confirm |

## OpenRouter catalog schema

```json
{
  "id": "string",
  "display_name": "string",
  "openrouter_model": "string",
  "tier": "Low|Medium|High|Fast|Thinking",
  "max_tokens": 8000,
  "badge": "Fast?",
  "role": "fast|pro",
  "thinking": false
}
```

Curated list: `services/agents/forge/models.catalog.json`.

## Model routing

| Step | Role | Default when Auto |
|------|------|-----------------|
| Classifier / mode | classifier | `karnex-forge-fast-low` |
| Supervisor / plan / debug | supervisor | Pro tier; MAX forces `gemini-3.1-pro-high` |
| Per-file codegen | fast | Flash tier unless `use_selected_model_all_steps` |

## Subagent registry by project_type

| project_type | Subagents |
|--------------|-----------|
| web_nextjs | supervisor, db_designer, ui_coder, linter, github |
| mobile_expo | supervisor, expo_scaffold, rn_screen_coder, linter, github |
| api_service | supervisor, api_route_coder, db_designer, openapi, github |
| infra_devops | supervisor, docker_coder, ci_coder, railway_config |
| fullstack_monorepo | All web + api roles |

## Debug paths

1. **paste_error** — Stack trace in spec → diagnosis + fix steps.
2. **proactive** — Keywords: scan, find bugs, lint → risk report.
3. **live_app** — `preview_url` set → runtime monitoring hints.

## Karnex context injection

Loaded in `forge/context.py`:

- `idea-crystallizer` / `product_brief`
- `icp-definer` / `personas`
- `war-room` / `roadmap_90_day`
- `sprint_tasks` row when `task_id` or `war_room_task_id` present

## UI checklist

### Studio

- [x] CTO chat + preview split
- [x] Advanced panel toggle
- [x] ModelPicker (search, Auto, MAX, tiers)
- [x] Mode + autonomy toolbar
- [x] Progress timeline from structured logs
- [x] Developer plan approval CTA

### Advanced Forge

- [x] Code panel + schema via AdvancedPanel
- [x] Model picker in header
- [x] Full event log in timeline

## API payload (`ForgeRunInput`)

See `BuilderInput` in `services/agents/builder/schemas.py` and `BuilderRequest` in `services/api/routes/agents.py`.

## Handoffs (Let Karnex)

After successful build, output may include `handoff_actions`: `research-v1`, `outreach-v1`, `analytics-insight-v1`.
