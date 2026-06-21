"""Human-readable step labels per agent for live UI checklists."""

from typing import Dict, List

AGENT_STEP_LABELS: Dict[str, List[str]] = {
    "pain-transformer-v1": [
        "Searching market context",
        "Generating hypotheses",
        "Saving to memory",
    ],
    "idea-crystallizer-v1": [
        "Reading product context",
        "Crystallizing brief",
        "Saving brief",
    ],
    "competitive-landscape-v1": [
        "Researching competitors",
        "Building feature matrix",
        "Saving analysis",
    ],
    "icp-definer-v1": [
        "Reading brief",
        "Defining ICP and personas",
        "Saving ICP",
    ],
    "war-room-v1": [
        "Reading founder context",
        "Planning 90-day roadmap",
        "Saving roadmap",
    ],
    "sprint-planner-v1": [
        "Reading phase and blockers",
        "Prioritizing tasks",
        "Enriching one-click configs",
    ],
    "builder-v1": [
        "Crystallizing intent",
        "Blueprinting architecture", 
        "Pre-generating visual assets",
        "Scaffolding foundation",
        "Building data layer",
        "Generating UI components",
        "Wiring integrations",
        "Running quality pass",
        "Testing & self-healing",
        "Deploying to production",
    ],
    "research-v1": [
        "Generating search queries",
        "Searching sources",
        "Synthesizing research brief",
    ],
    "outreach-v1": [
        "Researching audience",
        "Composing message sequence",
        "Saving draft campaign",
    ],
    "daily-standup-v1": [
        "Reading sprint tasks",
        "Summarizing standup",
        "Updating momentum",
    ],
    "weekly-debrief-v1": [
        "Aggregating week data",
        "Writing debrief",
        "Saving summary",
    ],
    "analytics-insight-v1": [
        "Loading metrics",
        "Detecting anomalies",
        "Recommending actions",
    ],
    "momentum-score-v1": [
        "Aggregating activity",
        "Calculating score",
        "Updating founder",
    ],
}

# Maps builder run status strings to step index
BUILDER_STATUS_TO_STEP: Dict[str, int] = {
    "queued": 0,
    "crystallizing": 0,
    "blueprinting": 1,
    "asset_generating": 2,
    "scaffolding": 3,
    "coding": 5,
    "compiling": 8,
    "deploying": 9,
    "success": 9,
    # Fallback/old status strings
    "decomposing_specifications": 0,
    "spawning_db_designer": 1,
    "spawning_ui_coder": 5,
    "running_linter_validation": 7,
    "committing_to_github": 9,
}

RESEARCH_STATUS_TO_STEP: Dict[str, int] = {
    "generating_search_queries": 0,
    "searching_web_sources": 1,
    "synthesizing_brief": 2,
    "success": 2,
}


def get_step_labels(agent_id: str) -> List[str]:
    return list(AGENT_STEP_LABELS.get(agent_id, ["Running agent pipeline"]))
