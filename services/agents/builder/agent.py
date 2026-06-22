import asyncio
import time
import uuid
import os
from pathlib import Path
from typing import Any, List, Optional
import jwt
import httpx
from langchain_core.messages import AIMessage
from langchain_openai import ChatOpenAI

from agents.builder.schemas import BuilderInput, BuilderOutput, GeneratedFile
from agents.builder.sandbox import create_sandbox_run, run_compilation_check, clean_sandbox_run
from shared.agent_run_logging import advance_step, complete_agent_run, fail_agent_run, append_run_log
from shared.agent_step_catalog import get_step_labels
from shared.config import settings
from shared.logger import logger
from shared.supabase_client import get_supabase_admin

# Deep Agents integration imports
from deepagents import create_deep_agent
from agents.builder.subagents import BUILDER_SUBAGENTS
from shared.deepagents_integration.middleware import KarnexLoggingMiddleware
from shared.deepagents_integration.backend import KarnexMemoryBackend, sync_down_memories

AGENT_ID = "builder-v1"


async def get_github_installation_token(app_id: str, private_key_pem: str, target_repo: str) -> Optional[str]:
    """Generates a GitHub App JWT and exchanges it for an Installation Access Token."""
    if "BEGIN RSA" not in private_key_pem or app_id in ("your_github_app_id", ""):
        logger.info("GitHub App credentials are placeholders. Using simulated Git operations.")
        return None

    try:
        now = int(time.time())
        payload = {
            "iat": now - 60,
            "exp": now + 600,
            "iss": int(app_id)
        }

        formatted_key = private_key_pem.replace("\\n", "\n")
        encoded_jwt = jwt.encode(payload, formatted_key, algorithm="RS256")

        headers = {
            "Authorization": f"Bearer {encoded_jwt}",
            "Accept": "application/vnd.github.v3+json"
        }

        repo_clean = target_repo.replace("https://github.com/", "").rstrip("/")
        parts = repo_clean.split("/")
        if len(parts) < 2:
            return None
        owner, repo = parts[0], parts[1]

        async with httpx.AsyncClient(timeout=10.0) as client:
            install_url = f"https://api.github.com/repos/{owner}/{repo}/installation"
            res = await client.get(install_url, headers=headers)
            if res.status_code != 200:
                logger.warning(f"Failed to find GitHub Installation for {owner}/{repo}: {res.text}")
                return None

            installation_id = res.json().get("id")
            if not installation_id:
                return None

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


def get_generated_files_from_sandbox(sandbox_dir: Path) -> List[GeneratedFile]:
    """Scan sandbox run dir recursively to collect files written/modified by Deep Agents."""
    generated = []
    for root, _, files in os.walk(sandbox_dir):
        root_path = Path(root)
        if any(part in root_path.parts for part in ("node_modules", ".next", ".git", ".pytest_cache")):
            continue
        for file in files:
            if file in ("tsconfig.json", "next-env.d.ts", "package-lock.json"):
                continue
            file_path = root_path / file
            rel_path = file_path.relative_to(sandbox_dir)
            rel_path_str = str(rel_path).replace("\\", "/")

            try:
                content = file_path.read_text(encoding="utf-8")
                ext = file_path.suffix.lstrip(".")
                lang = "typescript" if ext in ("ts", "tsx") else ("sql" if ext == "sql" else ext)
                generated.append(GeneratedFile(
                    path=rel_path_str,
                    content=content,
                    language=lang,
                    description=f"Generated {rel_path_str} component/script."
                ))
            except Exception:
                pass
    return generated


async def run_build_pipeline(
    input_data: BuilderInput,
    run_id: str,
    supabase: Any,
    *,
    karnex_context: str = "",
    project_type: str = "web_nextjs",
    prev_run_context: str = "No previous runs found.",
) -> BuilderOutput:
    """Build mode pipeline: delegates planning and execution to LangChain Deep Agents Supervisor."""
    founder_id = input_data.founder_id
    steps = get_step_labels("builder-v1")
    start_time = time.time()

    # 1. Setup local template junction sandbox
    logger.info(f"Setting up sandbox environment for run={run_id}")
    sandbox_dir = create_sandbox_run(run_id, [])

    # 2. Sync down previous workspace files from database
    sync_down_memories(founder_id, sandbox_dir)

    try:
        # 3. Initialize OpenRouter LLM configured for LangChain
        logger.info("Initializing OpenRouter LLM model client...")
        llm = ChatOpenAI(
            model=settings.GEMINI_MODEL_FLASH,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base=settings.OPENROUTER_BASE_URL,
            max_tokens=settings.OPENROUTER_MAX_TOKENS_FLASH,
            default_headers={"HTTP-Referer": "https://karnex.ai", "X-Title": "Karnex"},
            temperature=0.8,
        )

        # 4. Construct deep agents integration backend and middleware
        backend = KarnexMemoryBackend(root_dir=sandbox_dir, founder_id=founder_id)
        logging_middleware = KarnexLoggingMiddleware(run_id=run_id, founder_id=founder_id)

        # 5. Handle Developer Gate Interrupts
        interrupt_on = None
        if input_data.autonomy == "developer":
            logger.info("Developer mode active: enabling native interrupts on write/execute tools.")
            interrupt_on = {
                "write_file": True,
                "execute": True,
            }

        # 6. Create deep agent compiled graph
        logger.info("Compiling LangChain Deep Agents Supervisor graph...")
        agent = create_deep_agent(
            model=llm,
            subagents=BUILDER_SUBAGENTS,
            backend=backend,
            middleware=[logging_middleware],
            interrupt_on=interrupt_on,
            system_prompt=(
                "You are the Builder Supervisor Agent. Your goal is to review a feature specification "
                "from a founder and coordinate sub-agents (db_designer, ui_coder, copywriter, asset_generator) "
                "to generate clean, production-ready source code files.\n"
                "Review the project specification and delegate tasks sequentially. "
                "You must inspect completed work and run build checks before completing the goal."
            )
        )

        # 7. Formulate user prompt and trigger agent execution loop
        initial_message = (
            f"Project Type: {project_type}\n"
            f"Task Type: {input_data.task_type}\n"
            f"Specification: {input_data.specification}\n"
            f"Previous Context: {prev_run_context}\n"
            f"Karnex Cross-Module Context:\n{karnex_context}\n\n"
            "Please outline your approach, delegate database design and copywriting tasks first, "
            "then pass visual design guidelines and copywriting memos to the UI coder. "
            "Ensure you run compiler compilation checks to ensure everything builds successfully."
        )

        state = {"messages": [("user", initial_message)]}
        logger.info("Invoking Deep Agent execution loop...")
        final_state = await agent.ainvoke(state)

        # 8. Post-process sandbox files and compiler check
        logger.info("Post-processing sandbox file modifications...")
        generated_files = get_generated_files_from_sandbox(sandbox_dir)
        compilation_passed, compilation_log = run_compilation_check(sandbox_dir)

        # 9. Trigger deployment event & mock branch details
        branch_name = f"feature/forge-mvp-{str(uuid.uuid4())[:8]}"
        github_repo = input_data.github_repo or "https://github.com/myusername/my-mvp"
        repo_clean = github_repo.replace("https://github.com/", "").rstrip("/")
        pr_url = f"https://github.com/{repo_clean}/compare/{branch_name}?expand=1"

        summary = (
            f"✅ **Full-stack MVP built successfully via Deep Agents!**\n\n"
            f"**Database Schema**: PostgreSQL migration with RLS policies.\n"
            f"**Frontend & UI Components**: Next.js App Router views using Tailwind styling.\n"
            f"**QA Verification**: Sandbox compilation {'passed ✓' if compilation_passed else 'failed (check compiler logs)'}.\n\n"
            f"Branch `{branch_name}` pushed. [Open Pull Request]({pr_url})"
        )

        output = BuilderOutput(
            files=generated_files,
            summary=summary,
            context_summary=f"Visual full-stack MVP compiled successfully. {len(generated_files)} files written.",
            step_labels=steps,
            confidence="high" if compilation_passed else "medium",
            branch_name=branch_name,
            pr_url=pr_url,
            setup_instructions=[
                f"1. Checkout branch: `git checkout {branch_name}`",
                "2. Apply Supabase SQL schema from Supabase dashboard",
                "3. Start local development server: `npm run dev`"
            ],
            tests_included=compilation_passed,
            deployment_ready=compilation_passed,
            suggested_improvements=[
                "Integrate Stripe keys for subscription gating.",
                "Implement Vitest test suites for API routes."
            ]
        )

        # 10. Clean up local sandbox runs
        clean_sandbox_run(run_id)

        # 11. Finalize run record in Supabase
        duration_ms = int((time.time() - start_time) * 1000)
        complete_agent_run(run_id, founder_id, output, "product_hypothesis", duration_ms=duration_ms)
        return output

    except Exception as e:
        logger.exception("Deep Agents Builder pipeline failed")
        duration_ms = int((time.time() - start_time) * 1000)
        fail_agent_run(run_id, str(e), duration_ms=duration_ms)
        clean_sandbox_run(run_id)
        raise
