"""Karnex Forge Vault Export — auto-save build outputs to founder memory.

Provides vault-first persistence for every Forge build, ensuring
generated code and assets are always backed up in the founder's vault.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from agents.builder.schemas import BuilderOutput
from agents.pain_transformer.tools import karnex_memory_write
from shared.logger import logger
from shared.supabase_client import get_supabase_admin


async def export_to_vault(
    founder_id: str,
    project_id: str,
    session_id: str,
    output: BuilderOutput,
    supabase: Any = None,
) -> str:
    """Save all generated assets to founder_memory under vault namespace.

    Stores:
      - File manifest (paths, descriptions, languages)
      - Build summary and setup instructions
      - PR URL and branch info
      - QA score if available

    Returns:
        vault_export_id: Unique identifier for this vault export.
    """
    vault_export_id = str(uuid.uuid4())
    sb = supabase or get_supabase_admin()

    file_manifest = [
        {
            "path": f.path,
            "language": f.language,
            "description": f.description,
            "size": len(f.content),
        }
        for f in (output.files or [])
    ]

    vault_payload = {
        "vault_export_id": vault_export_id,
        "project_id": project_id,
        "session_id": session_id,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "summary": output.summary,
        "files": file_manifest,
        "file_count": len(file_manifest),
        "total_code_bytes": sum(len(f.content) for f in (output.files or [])),
        "setup_instructions": output.setup_instructions,
        "deployment_ready": output.deployment_ready,
        "tests_included": output.tests_included,
        "pr_url": output.pr_url,
        "branch_name": output.branch_name,
        "qa_score": getattr(output, "qa_score", None),
        "suggested_improvements": output.suggested_improvements,
    }

    # Save manifest to founder_memory
    try:
        karnex_memory_write(
            founder_id,
            namespace="vault",
            key=f"forge_export_{vault_export_id}",
            value=vault_payload,
        )
    except Exception as e:
        logger.warning(f"Vault export: could not write to founder_memory: {e}")

    # Save individual files to vault storage (truncated for large codebases)
    try:
        file_contents = {
            f.path: f.content[:50000]  # Cap at 50KB per file
            for f in (output.files or [])[:20]  # Max 20 files
        }
        karnex_memory_write(
            founder_id,
            namespace="vault",
            key=f"forge_code_{vault_export_id}",
            value=file_contents,
        )
    except Exception as e:
        logger.warning(f"Vault export: could not write code files: {e}")

    # Update forge_projects with latest vault reference
    if project_id:
        try:
            sb.table("forge_projects").update({
                "project_context": {
                    "latest_vault_export_id": vault_export_id,
                    "last_exported_at": datetime.now(timezone.utc).isoformat(),
                }
            }).eq("id", project_id).execute()
        except Exception as e:
            logger.warning(f"Vault export: could not update forge_projects: {e}")

    logger.info(
        f"Vault export complete: {vault_export_id} | "
        f"{len(file_manifest)} files | "
        f"project={project_id}"
    )
    return vault_export_id


async def generate_fundraising_package(
    founder_id: str,
    project_id: str,
    supabase: Any = None,
) -> Dict[str, Any]:
    """Generate a fundraising export package containing product evidence.

    Compiles:
      - Feature summary from latest build
      - Tech stack details
      - Live deployment URL
      - Screenshot references
      - Pitch slide data points

    Returns:
        dict with fundraising package data.
    """
    sb = supabase or get_supabase_admin()
    package: Dict[str, Any] = {
        "project_id": project_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "product_evidence": {},
        "tech_stack": {},
        "deployment": {},
        "metrics": {},
    }

    # Load project details
    try:
        res = (
            sb.table("forge_projects")
            .select("name, tech_stack, deployment_url, github_repo_url, current_version, status")
            .eq("id", project_id)
            .eq("founder_id", founder_id)
            .maybe_single()
            .execute()
        )
        if res.data:
            p = res.data
            package["product_evidence"]["name"] = p.get("name")
            package["tech_stack"] = p.get("tech_stack", {})
            package["deployment"] = {
                "live_url": p.get("deployment_url"),
                "github_url": p.get("github_repo_url"),
                "version_count": p.get("current_version", 0),
                "status": p.get("status"),
            }
    except Exception as e:
        logger.warning(f"Fundraising package: project data unavailable: {e}")

    # Load build session stats
    try:
        sessions_res = (
            sb.table("forge_sessions")
            .select("files_generated, tokens_used, cost_usd, qa_score, mode, created_at")
            .eq("project_id", project_id)
            .eq("status", "success")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        if sessions_res.data:
            total_files = sum(
                s.get("files_generated", 0) or 0 for s in sessions_res.data
                if isinstance(s.get("files_generated"), int)
            )
            avg_qa = [s.get("qa_score") for s in sessions_res.data if s.get("qa_score")]
            package["metrics"] = {
                "total_build_sessions": len(sessions_res.data),
                "total_files_generated": total_files,
                "average_qa_score": round(sum(avg_qa) / len(avg_qa), 1) if avg_qa else None,
                "first_build_date": sessions_res.data[-1].get("created_at"),
                "latest_build_date": sessions_res.data[0].get("created_at"),
            }
    except Exception as e:
        logger.warning(f"Fundraising package: session stats unavailable: {e}")

    # Load latest build output summary
    try:
        latest_output = karnex_memory_read(founder_id, "vault", f"forge_export_latest_{project_id}")
        if latest_output and isinstance(latest_output, dict):
            package["product_evidence"]["summary"] = latest_output.get("summary")
            package["product_evidence"]["feature_count"] = latest_output.get("file_count", 0)
    except Exception:
        pass

    return package
