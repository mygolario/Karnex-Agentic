import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

import httpx
import jwt
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from agents.builder.prompts import (
    BUILDER_SUPERVISOR_SYSTEM_PROMPT,
    DB_DESIGNER_SYSTEM_PROMPT,
    UI_CODER_SYSTEM_PROMPT,
)
from agents.builder.schemas import BuilderInput, BuilderOutput, GeneratedFile
from agents.pain_transformer.tools import karnex_memory_write
from shared.agent_run_logging import advance_step
from shared.agent_step_catalog import BUILDER_STATUS_TO_STEP, get_step_labels
from agents.forge.catalog import load_catalog
from agents.forge.events import emit_forge_event
from agents.forge.project_types import stack_prompt_suffix
from shared.config import settings
from shared.logger import logger
from shared.openrouter_client import model_from_catalog_entry, resolve_step_model
from shared.supabase_client import get_supabase_admin


# Sub-agent output Pydantic helpers
class PromptClassification(BaseModel):
    category: str = Field(..., description="'BUILD' (scaffold, code, tables, layout, app logic) or 'CHAT' (greeting, question, chat, casual prompt).")
    chat_reply: Optional[str] = Field(None, description="Conversational reply if category is 'CHAT'. Let it be friendly, intelligent, and helpful.")

class FileSpecification(BaseModel):
    path: str = Field(..., description="Target relative file path.")
    role: str = Field(..., description="File role: 'db_migration' | 'frontend_page' | 'api_route' | 'component'.")
    description: str = Field(..., description="Short specification of what this file should contain.")

class SupervisorPlan(BaseModel):
    files_to_generate: List[FileSpecification] = Field(..., description="List of files that need to be generated.")
    summary_of_approach: str = Field(..., description="General architectural summary.")
    status_message: str = Field(..., description="A friendly, brief update to the user explaining what files you've planned to build and why.")

class DatabaseCodeOutput(BaseModel):
    sql_content: str = Field(..., description="Plain PostgreSQL script.")
    status_message: str = Field(..., description="A short, one-sentence progress update to the user about what SQL tables and security policies you designed.")

class UICodeOutput(BaseModel):
    react_code: str = Field(..., description="Complete React TypeScript file content.")
    status_message: str = Field(..., description="A short, one-sentence progress update to the user about what UI sections and styles you designed for this file.")


async def _append_run_log(supabase: Any, run_id: str, sender: str, message: str, **meta: Any):
    await emit_forge_event(supabase, run_id, event_type=meta.pop("event_type", "log"), sender=sender, message=message, **meta)


async def _update_run_status_detail(supabase: Any, run_id: str, detail: str):
    """Updates run status and advances checklist step."""
    steps = get_step_labels("builder-v1")
    idx = BUILDER_STATUS_TO_STEP.get(detail, 0)
    label = steps[idx] if idx < len(steps) else detail.replace("_", " ").title()
    try:
        advance_step(run_id, idx, label, status_detail=detail, tool_name=detail)
    except Exception as e:
        logger.warning(f"Could not update status detail for run {run_id} to '{detail}': {e}")


async def get_github_installation_token(app_id: str, private_key_pem: str, target_repo: str) -> Optional[str]:
    """Generates a GitHub App JWT and exchanges it for an Installation Access Token.

    Returns None if validation fails or is set to placeholders.
    """
    if "BEGIN RSA" not in private_key_pem or app_id in ("your_github_app_id", ""):
        logger.info("GitHub App credentials are placeholders. Using simulated Git operations.")
        return None

    try:
        # 1. Generate JWT
        now = int(time.time())
        payload = {
            "iat": now - 60,
            "exp": now + 600,
            "iss": int(app_id)
        }

        # Format key if it contains literal '\n' characters
        formatted_key = private_key_pem.replace("\\n", "\n")
        encoded_jwt = jwt.encode(payload, formatted_key, algorithm="RS256")

        headers = {
            "Authorization": f"Bearer {encoded_jwt}",
            "Accept": "application/vnd.github.v3+json"
        }

        # Parse owner and repo from target_repo URL or string
        repo_clean = target_repo.replace("https://github.com/", "").rstrip("/")
        parts = repo_clean.split("/")
        if len(parts) < 2:
            return None
        owner, repo = parts[0], parts[1]

        # 2. Find installation for repository
        async with httpx.AsyncClient(timeout=10.0) as client:
            install_url = f"https://api.github.com/repos/{owner}/{repo}/installation"
            res = await client.get(install_url, headers=headers)
            if res.status_code != 200:
                logger.warning(f"Failed to find GitHub Installation for {owner}/{repo}: {res.text}")
                return None

            installation_id = res.json().get("id")
            if not installation_id:
                return None

            # 3. Exchange JWT for access token
            token_url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
            token_res = await client.post(token_url, headers=headers)
            if token_res.status_code == 201:
                return token_res.json().get("token")

            logger.warning(f"Failed to fetch installation access token: {token_res.text}")
            return None
    except Exception as e:
        logger.warning(f"Error authenticating with GitHub App: {e}")
        return None


async def run_builder(input_data: BuilderInput, run_id: str, supabase: Any = None) -> BuilderOutput:
    """Karnex Forge entry — delegates to forge orchestrator."""
    from agents.forge.orchestrator import run_forge

    return await run_forge(input_data, run_id, supabase=supabase)


async def run_build_pipeline(
    input_data: BuilderInput,
    run_id: str,
    supabase: Any,
    *,
    karnex_context: str = "",
    project_type: str = "web_nextjs",
    prev_run_context: str = "No previous runs found.",
) -> BuilderOutput:
    """Build mode pipeline: delegates to stateful Multi-Agent DAG."""
    from agents.builder.dag import MultiAgentDAGRunner
    from shared.agent_run_logging import complete_agent_run

    runner = MultiAgentDAGRunner(input_data, run_id, supabase)
    output = await runner.run()
    return output

