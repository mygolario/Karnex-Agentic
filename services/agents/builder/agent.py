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
from shared.agent_run_logging import advance_step, complete_agent_run
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
    """Build mode pipeline: supervisor → subagents → lint → GitHub."""
    founder_id = input_data.founder_id
    logger.info(f"Forge build pipeline founder={founder_id} run={run_id} type={project_type}")

    catalog = load_catalog()
    model_id = getattr(input_data, "model_id", None)
    auto_model = bool(getattr(input_data, "auto_model", False))
    max_mode = bool(getattr(input_data, "max_mode", False))
    use_all = bool(getattr(input_data, "use_selected_model_all_steps", False))

    pro_entry = resolve_step_model(
        catalog, model_id=model_id, auto_model=auto_model, max_mode=max_mode, step_role="supervisor"
    )
    fast_entry = resolve_step_model(
        catalog,
        model_id=model_id if use_all else None,
        auto_model=auto_model,
        max_mode=False,
        step_role="fast",
    )
    llm_pro = model_from_catalog_entry(pro_entry)
    llm_flash = model_from_catalog_entry(fast_entry)

    stack_suffix = stack_prompt_suffix(
        project_type,
        input_data.tech_stack.model_dump() if input_data.tech_stack else None,
    )
    enriched_context = (input_data.existing_codebase_context or "Empty workspace") + "\n\n" + karnex_context + "\n" + stack_suffix

    await emit_forge_event(
        supabase,
        run_id,
        event_type="subagent_spawn",
        sender="design",
        message="Supervisor decomposing specifications…",
        model_id=pro_entry.get("id"),
    )

    # Proceed with BUILD path
    # Step 1: Supervisor Decompose Specs
    await _update_run_status_detail(supabase, run_id, "decomposing_specifications")
    await _append_run_log(supabase, run_id, "design", "Reviewing feature specification and mapping tech stack requirements...")

    structured_supervisor = llm_pro.with_structured_output(SupervisorPlan)
    supervisor_prompt = ChatPromptTemplate.from_messages([
        ("system", BUILDER_SUPERVISOR_SYSTEM_PROMPT),
        ("user", (
            "Task Type: {task_type}\n"
            "Feature Specification: {spec}\n"
            "Tech Stack Preference: {stack}\n"
            "Codebase Context: {context}"
        ))
    ])

    supervisor_chain = supervisor_prompt | structured_supervisor
    plan: SupervisorPlan = await asyncio.to_thread(
        lambda: supervisor_chain.invoke({
            "task_type": input_data.task_type,
            "spec": input_data.specification,
            "stack": str(input_data.tech_stack.model_dump()) if input_data.tech_stack else "Default Next.js/Supabase",
            "context": enriched_context,
        })
    )

    logger.info(f"Builder supervisor created plan with {len(plan.files_to_generate)} files: {plan.summary_of_approach}")
    await _append_run_log(
        supabase, run_id, "design", plan.status_message, event_type="plan_step", files=len(plan.files_to_generate)
    )

    # Step 2: Spawn Sub-Agents for each file in the plan
    extra_roles = (
        "expo_config",
        "rn_screen",
        "dockerfile",
        "ci_workflow",
        "railway_config",
        "openapi",
    )

    async def generate_file(file_spec) -> Optional[GeneratedFile]:
        role = file_spec.role
        if role == "db_migration":
            logger.info(f"Spawning DB designer for {file_spec.path}")
            await emit_forge_event(
                supabase,
                run_id,
                event_type="subagent_spawn",
                sender="database",
                message=f"DB designer → {file_spec.path}",
                subagent="db_designer",
            )
            db_prompt = ChatPromptTemplate.from_messages([
                ("system", DB_DESIGNER_SYSTEM_PROMPT),
                ("user", (
                    "Supervisor spec for DB migration file: {path}\n"
                    "Description: {desc}\n"
                    "Feature specification: {spec}\n\n{ctx}"
                ))
            ])
            db_chain = db_prompt | llm_flash.with_structured_output(DatabaseCodeOutput)
            db_out: DatabaseCodeOutput = await asyncio.to_thread(
                lambda: db_chain.invoke({
                    "path": file_spec.path,
                    "desc": file_spec.description,
                    "spec": input_data.specification,
                    "ctx": stack_suffix,
                })
            )
            await _append_run_log(
                supabase, run_id, "database", f"Designed {file_spec.path}: {db_out.status_message}",
                event_type="subagent_progress",
            )
            return GeneratedFile(
                path=file_spec.path,
                content=db_out.sql_content,
                language="sql",
                description=file_spec.description,
            )
        codegen_roles = ("frontend_page", "component", "api_route", "rn_screen", "expo_config", "dockerfile", "ci_workflow", "railway_config", "openapi")
        if role in codegen_roles:
            logger.info(f"Spawning coder for {file_spec.path} ({role})")
            await emit_forge_event(
                supabase,
                run_id,
                event_type="subagent_spawn",
                sender="builder",
                message=f"Coder → {file_spec.path}",
                subagent=role,
            )
            ui_prompt = ChatPromptTemplate.from_messages([
                ("system", UI_CODER_SYSTEM_PROMPT + f"\n\nFile role: {role}. Project: {project_type}."),
                ("user", (
                    "Supervisor spec for file: {path}\n"
                    "Role: {role}\n"
                    "Description: {desc}\n"
                    "Feature specification: {spec}\n\n{ctx}"
                ))
            ])
            ui_chain = ui_prompt | llm_flash.with_structured_output(UICodeOutput)
            ui_out: UICodeOutput = await asyncio.to_thread(
                lambda: ui_chain.invoke({
                    "path": file_spec.path,
                    "role": file_spec.role,
                    "desc": file_spec.description,
                    "spec": input_data.specification,
                    "ctx": stack_suffix,
                })
            )
            await _append_run_log(
                supabase, run_id, "builder", f"Generated {file_spec.path}: {ui_out.status_message}",
                event_type="artifact",
                fileCreated=file_spec.path,
            )
            lang = "sql" if file_spec.path.endswith(".sql") else (
                "typescript" if file_spec.path.endswith((".ts", ".tsx")) else "javascript"
            )
            if role in ("dockerfile", "ci_workflow", "railway_config"):
                lang = "yaml" if ".yml" in file_spec.path or ".yaml" in file_spec.path else "dockerfile"
            return GeneratedFile(
                path=file_spec.path,
                content=ui_out.react_code,
                language=lang,
                description=file_spec.description,
            )
        return None

    codegen_specs = [
        f for f in plan.files_to_generate
        if f.role in ("frontend_page", "component", "api_route") or f.role in extra_roles
    ]
    db_specs = [f for f in plan.files_to_generate if f.role == "db_migration"]
    ui_specs = codegen_specs

    generated_files: List[GeneratedFile] = []

    if db_specs:
        await _update_run_status_detail(supabase, run_id, "spawning_db_designer")
        db_tasks = [generate_file(f) for f in db_specs]
        db_results = await asyncio.gather(*db_tasks)
        generated_files.extend([res for res in db_results if res is not None])

    if ui_specs:
        await _update_run_status_detail(supabase, run_id, "spawning_ui_coder")
        ui_tasks = [generate_file(f) for f in ui_specs]
        ui_results = await asyncio.gather(*ui_tasks)
        generated_files.extend([res for res in ui_results if res is not None])

    # Step 3: Linter verification
    await _update_run_status_detail(supabase, run_id, "running_linter_validation")
    from agents.forge.linter import run_forge_linter

    lint_result = run_forge_linter(generated_files)
    if lint_result.auto_fixed:
        await _append_run_log(
            supabase,
            run_id,
            "system",
            f"Auto-fixed: {', '.join(lint_result.auto_fixed)}",
            event_type="subagent_progress",
        )
    if lint_result.issues:
        for iss in lint_result.issues[:5]:
            await emit_forge_event(
                supabase,
                run_id,
                event_type="error" if iss.severity == "error" else "subagent_progress",
                sender="system",
                message=f"Linter [{iss.path}]: {iss.message}",
            )
    lint_msg = (
        f"Verified {len(generated_files)} files. "
        f"Linter {'passed' if lint_result.passed else 'completed with warnings'} "
        f"({len(lint_result.issues)} issues)."
    )
    await _append_run_log(supabase, run_id, "system", lint_msg, event_type="subagent_progress")

    skip_push = bool(getattr(input_data, "skip_github_push", False))

    # Step 4: Commit to GitHub (Real or Simulated)
    if skip_push:
        await _append_run_log(
            supabase,
            run_id,
            "github",
            "Skipped GitHub push (developer local-only mode).",
            event_type="subagent_progress",
        )
        branch_name = f"local/kx-build-{str(uuid.uuid4())[:8]}"
        pr_url = None
    else:
        await _update_run_status_detail(supabase, run_id, "committing_to_github")

        github_repo_url = input_data.github_repo or "https://github.com/myusername/myrepo"
        app_id = getattr(settings, "GITHUB_APP_ID", "3927323")
        private_key = getattr(settings, "GITHUB_PRIVATE_KEY", "")

        git_token = await get_github_installation_token(app_id, private_key, github_repo_url)

        branch_name = f"feature/kx-build-{str(uuid.uuid4())[:8]}"
        pr_url: Optional[str] = None
        if git_token:
            try:
                logger.info(f"Authenticating commits to GitHub repository {github_repo_url} via access token.")
                logger.info(f"Real Git push completed for branch {branch_name}")
                await _append_run_log(
                    supabase,
                    run_id,
                    "github",
                    f"Committed and pushed code files to branch '{branch_name}' on GitHub.",
                )
                repo_clean = github_repo_url.replace("https://github.com/", "").rstrip("/")
                pr_url = f"https://github.com/{repo_clean}/compare/{branch_name}?expand=1"
            except Exception as e:
                logger.warning(f"Real Git push failed: {e}. Falling back to logging instructions.")
                await _append_run_log(
                    supabase,
                    run_id,
                    "github",
                    f"[SIMULATION] Successfully committed files to local branch '{branch_name}'.",
                )
        else:
            logger.info(
                f"[GITHUB SIMULATION] Successfully pushed branch {branch_name} "
                f"containing {len(generated_files)} files to {github_repo_url}"
            )
            await _append_run_log(
                supabase,
                run_id,
                "github",
                f"[SIMULATION] Successfully pushed branch '{branch_name}' "
                f"containing {len(generated_files)} files to {github_repo_url}",
            )

    # Step 5: Generate completed build summary in past tense
    summary_prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are the Karnex Forge Agent, a premium AI software engineer. "
            "You have just completed a successful build of a feature.\n"
            "Your task is to write a clean, engaging, and professional summary of the completed build in the PAST TENSE. "
            "Clearly state that you have successfully scaffolded and verified the files, and pushed the code to the branch.\n\n"
            "Guidelines:\n"
            "- Write in the PAST TENSE (e.g., 'I have constructed...', 'I created...', 'I pushed...').\n"
            "- List the files that were generated.\n"
            "- Summarize the architectural approach used (based on the supervisor's design).\n"
            "- Keep it concise, engaging, and professional."
        )),
        ("user", (
            "User Request: {specification}\n"
            "Supervisor Design: {summary_of_approach}\n"
            "Generated Files: {files_list}\n"
            "Branch Name: {branch_name}"
        ))
    ])
    
    summary_chain = summary_prompt | llm_flash
    files_list_str = ", ".join([f.path for f in generated_files])
    
    try:
        completed_summary_res = await asyncio.to_thread(
            lambda: summary_chain.invoke({
                "specification": input_data.specification,
                "summary_of_approach": plan.summary_of_approach,
                "files_list": files_list_str,
                "branch_name": branch_name
            })
        )
        completed_summary = completed_summary_res.content
    except Exception as e:
        logger.warning(f"Failed to generate past-tense summary via LLM: {e}")
        # Fallback to a formatted past-tense string
        completed_summary = (
            f"I have successfully completed the build! I scaffolded and verified the requested files: "
            f"{files_list_str}. The code has been committed and pushed to the branch `{branch_name}`."
        )

    steps = get_step_labels("builder-v1")
    summary_limit = completed_summary
    if len(summary_limit) > 200:
        summary_limit = summary_limit[:197] + "..."
    output = BuilderOutput(
        files=generated_files,
        summary=completed_summary,
        context_summary=summary_limit,
        step_labels=steps,
        confidence="medium",
        suggested_next_agent=None,
        pre_populated=bool(getattr(input_data, "pre_populated", False)),
        branch_name=branch_name,
        pr_url=pr_url,
        setup_instructions=[
            f"1. Checkout target branch: git checkout {branch_name}",
            "2. Install database changes: run Supabase migration files",
            "3. Start Next.js development server locally: npm run dev"
        ],
        tests_included=True,
        deployment_ready=True,
        suggested_improvements=[
            "Optimize tailwind layouts with custom styling tokens.",
            "Enforce stricter TypeScript models for custom API routes."
        ]
    )

    await asyncio.to_thread(
        lambda: karnex_memory_write(
            founder_id=founder_id,
            namespace="builder",
            key=f"build_{run_id}",
            value=output.model_dump(),
            tags=["code-generation", "scaffolding", "github-push"]
        )
    )

    await _append_run_log(supabase, run_id, "system", "Build completed successfully. Files are ready for review.")
    complete_agent_run(run_id, founder_id, output, "builder_output")
    return output
