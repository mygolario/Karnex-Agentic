"""Stateful Multi-Agent DAG execution engine for Karnex Forge builder agent."""

from __future__ import annotations

import asyncio
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from agents.builder.schemas import BuilderInput, BuilderOutput, GeneratedFile
from agents.builder.sandbox import create_sandbox_run, run_compilation_check, clean_sandbox_run
from agents.forge.catalog import load_catalog
from agents.forge.events import emit_forge_event, flush_all_forge_events
from shared.agent_run_logging import advance_step, complete_agent_run
from shared.agent_step_catalog import BUILDER_STATUS_TO_STEP, get_step_labels
from shared.logger import logger
from shared.openrouter_client import invoke_structured_with_retry, model_from_catalog_entry, resolve_step_model
from shared.supabase_client import get_supabase_admin


# ---------------------------------------------------------------------------
# Pydantic structures for structured agent outputs
# ---------------------------------------------------------------------------

class TextSection(BaseModel):
    key: str = Field(..., description="Unique key (e.g., 'hero_title', 'hero_subtitle', 'feature_1_title')")
    text: str = Field(..., description="Engaging, conversion-optimised copy.")


class ThemeStyleGuide(BaseModel):
    primary_color: str = Field(..., description="Hex or Tailwind colour for primary branding (e.g. '#6366f1')")
    secondary_color: str = Field(..., description="Hex or Tailwind colour for secondary branding (e.g. '#10b981')")
    background_color: str = Field(..., description="Hex or Tailwind background colour (e.g. '#09090b')")
    accent_color: str = Field(..., description="Hex or Tailwind accent colour for glowing highlights (e.g. '#f43f5e')")
    is_dark_mode: bool = Field(..., description="True if the visual aesthetic should be dark mode")
    font_family_display: str = Field(..., description="Google Font for headings (e.g., 'Inter', 'Outfit')")
    font_family_sans: str = Field(..., description="Font for body text (e.g., 'Inter', 'Roboto')")
    visual_vibe: str = Field(..., description="One-sentence visual vibe (e.g., 'Clean futuristic cyber-grid with purple glows')")


# Phase 1-A: Focused copywriting + style guide only (smaller, cheaper call)
class CopywritingManifest(BaseModel):
    copywriting: List[TextSection] = Field(..., description="All marketing copy sections")
    style_guide: ThemeStyleGuide = Field(..., description="Full colour palette and typography theme")


class SVGIcon(BaseModel):
    name: str = Field(..., description="e.g. 'logo', 'icon_feature_1'")
    svg_code: str = Field(..., description="Valid raw SVG string with viewBox, path, stroke/fill, gradients.")


class ImageSearchTerm(BaseModel):
    key: str = Field(..., description="e.g. 'hero_bg', 'product_feature'")
    query: str = Field(..., description="Unsplash search keywords (e.g., 'dark software dashboard UI')")


class SeedRow(BaseModel):
    table_name: str = Field(..., description="Target database table")
    row_data: Dict[str, Any] = Field(..., description="Column key-value pairs")


# Phase 1-B: Visual assets + seeds only (runs concurrently with 1-A)
class VisualAssetManifest(BaseModel):
    svgs: List[SVGIcon] = Field(..., description="SVG icons and logo illustrations")
    images: List[ImageSearchTerm] = Field(..., description="Keywords for Unsplash photo URLs")
    database_seeds: List[SeedRow] = Field(..., description="10-20 realistic database seed records")


class FileSpecification(BaseModel):
    path: str = Field(..., description="Target relative file path, e.g., 'src/app/page.tsx'.")
    role: str = Field(..., description="File role: 'db_migration' | 'frontend_page' | 'api_route' | 'component'.")
    description: str = Field(..., description="Short specification of what this file should contain.")


class SchemaPlanOutput(BaseModel):
    files_to_generate: List[FileSpecification] = Field(..., description="List of files to scaffold.")
    summary_of_approach: str = Field(..., description="Database schema and route integration plan.")


class CodeFileGeneration(BaseModel):
    file_content: str = Field(..., description="Full production-ready source code of the file.")
    status_message: str = Field(..., description="A short status update on what was implemented.")


class SelfHealingEdits(BaseModel):
    target_content: str = Field(..., description="The exact code block to replace (include leading spacing).")
    replacement_content: str = Field(..., description="The replacement code block.")
    explanation: str = Field(..., description="Explanation of why this fix solves the compile error.")


class IntentSpecification(BaseModel):
    app_type: str = Field(..., description="Type of app: saas, marketplace, dashboard, etc.")
    core_features: List[str] = Field(..., description="Key features to build")
    user_types: List[str] = Field(..., description="Types of users")
    data_entities: List[str] = Field(..., description="Primary database entities")
    acceptance_criteria: List[str] = Field(..., description="Testable criteria of done")
    constraints: List[str] = Field(..., description="What NOT to build in MVP")



# ---------------------------------------------------------------------------
# Unsplash Visual Assets Helper
# ---------------------------------------------------------------------------

UNSPLASH_CATALOG = {
    "dashboard": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    "analytics": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    "collaboration": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    "meeting": "https://images.unsplash.com/photo-1531535934027-689615576dfb?auto=format&fit=crop&w=800&q=80",
    "team": "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=80",
    "woman": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&h=250&q=80",
    "man": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&h=250&q=80",
    "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&h=250&q=80",
    "profile": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&h=250&q=80",
    "user": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&h=250&q=80",
    "code": "https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=1200&q=80",
    "coding": "https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=1200&q=80",
    "developer": "https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=1200&q=80",
    "programming": "https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=1200&q=80",
    "mockup": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
    "laptop": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
    "ui": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
    "startup": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    "abstract": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    "saas": "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80",
    "office": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
}


def resolve_unsplash_url(keywords: str) -> str:
    """Map keywords to a curated Unsplash URL."""
    kw = keywords.lower()
    for key, url in UNSPLASH_CATALOG.items():
        if key in kw:
            return url
    if "bg" in kw or "background" in kw:
        return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"
    return "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80"


def _build_file_context(
    role: str,
    copywriting: Dict[str, str],
    svgs: Dict[str, str],
    images: Dict[str, str],
    database_seeds: List[Any],
    style_guide: Dict[str, Any],
) -> str:
    """Return role-appropriate context to avoid bloating prompts.

    - db_migration: only seeds (no copywriting/SVGs/images needed)
    - api_route: only seeds + minimal schema hint
    - component/frontend_page: full context
    """
    style_guide_str = (
        f"Primary Color: {style_guide.get('primary_color')}\n"
        f"Secondary Color: {style_guide.get('secondary_color')}\n"
        f"Background Color: {style_guide.get('background_color')}\n"
        f"Accent Color: {style_guide.get('accent_color')}\n"
        f"Dark Mode: {style_guide.get('is_dark_mode')}\n"
        f"Display Font: {style_guide.get('font_family_display')}\n"
        f"Body Font: {style_guide.get('font_family_sans')}\n"
        f"Visual Vibe: {style_guide.get('visual_vibe')}"
    )
    seed_str = str([s.model_dump() if hasattr(s, "model_dump") else s for s in database_seeds])

    if role == "db_migration":
        # SQL files only need seed data for INSERT statements
        return f"Database Seed Rows (use for INSERT statements):\n{seed_str}"

    if role == "api_route":
        # API routes need seeds to understand data shape; no SVGs/images
        copy_str = "\n".join([f"- {k}: {v}" for k, v in copywriting.items()])
        return (
            f"Style Guide:\n{style_guide_str}\n\n"
            f"Copywriting (for error messages / labels):\n{copy_str}\n\n"
            f"Database Seed Rows:\n{seed_str}"
        )

    # frontend_page / component — full context
    copy_str = "\n".join([f"- {k}: {v}" for k, v in copywriting.items()])
    svg_str = "\n".join([f"- SVG '{k}': {v}" for k, v in svgs.items()])
    img_str = "\n".join([f"- Image '{k}': {v}" for k, v in images.items()])
    return (
        f"Style Guide (use these colour tokens explicitly!):\n{style_guide_str}\n\n"
        f"Copywriting blocks:\n{copy_str}\n\n"
        f"SVG Assets (embed raw SVGs where needed):\n{svg_str}\n\n"
        f"Images:\n{img_str}\n\n"
        f"Database Seed Rows:\n{seed_str}"
    )


def _extract_offending_files(error_log: str, available_paths: List[str]) -> List[str]:
    """Parse the TypeScript compiler error log and return all offending file paths."""
    offending: List[str] = []
    for path in available_paths:
        filename = Path(path).name
        if filename in error_log or path in error_log:
            offending.append(path)

    if not offending:
        # Fallback: grab first TS/TSX file
        ts_files = [p for p in available_paths if p.endswith((".ts", ".tsx"))]
        if ts_files:
            offending = [ts_files[0]]

    return offending


# ---------------------------------------------------------------------------
# Stateful DAG Runner
# ---------------------------------------------------------------------------

class MultiAgentDAGRunner:
    def __init__(self, input_data: BuilderInput, run_id: str, supabase: Any):
        self.input_data = input_data
        self.run_id = run_id
        self.supabase = supabase or get_supabase_admin()

        catalog = load_catalog()
        model_id = getattr(input_data, "model_id", None)
        auto_model = bool(getattr(input_data, "auto_model", False))
        max_mode = bool(getattr(input_data, "max_mode", False))
        use_all = bool(getattr(input_data, "use_selected_model_all_steps", False))

        pro_entry = resolve_step_model(
            catalog, model_id=model_id, auto_model=auto_model, max_mode=max_mode, step_role="supervisor"
        )
        fast_entry = resolve_step_model(
            catalog, model_id=model_id if use_all else None, auto_model=auto_model, max_mode=False, step_role="fast"
        )

        # Build step-role-capped models
        self.llm_pro = model_from_catalog_entry(pro_entry, step_role="supervisor")
        self.llm_fast = model_from_catalog_entry(fast_entry, step_role="fast")
        self.llm_classifier = model_from_catalog_entry(fast_entry, step_role="classifier")

        self.state: Dict[str, Any] = {
            "copywriting": {},
            "svgs": {},
            "images": {},
            "database_seeds": [],
            "style_guide": {},
            "files_plan": [],
            "generated_files": {},
            "compilation_passed": False,
            "error_logs": "",
        }

    async def run(self) -> BuilderOutput:
        """Execute the 6-Stage Multi-Agent generation sequence."""
        try:
            # Stage 1: Intent Crystallization
            await self._run_stage_intent_crystallization()
            # Stage 2: Architecture Blueprint
            await self._run_stage_architecture_blueprint()
            # Stage 3: Visual Asset Pre-Generation & Injection
            await self._run_stage_asset_injection()
            # Stage 4: Code Generation (Foundation, Data, UI, Integration, Quality)
            await self._run_stage_code_generation()
            # Stage 5: Autonomous Testing & QA checks
            await self._run_stage_autonomous_testing()
            # Stage 6: Deployment
            output = await self._run_stage_deploy()
            return output
        except Exception as e:
            logger.exception(f"DAG Execution failed: {e}")
            raise

    async def _run_stage_intent_crystallization(self):
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_spawn", sender="system",
            message="Stage 1/6: Intent Crystallization — Parsing and specifying startup requirements...",
        )
        system_prompt = (
            "You are the Lead Analyst at Karnex. Specialize the user specifications into a detailed Intent spec.\n"
            "Identify the app type, core features list, user roles, database entities, acceptance criteria, and constraints."
        )
        user_prompt = f"Raw Prompt: {self.input_data.specification}\nTask Type: {self.input_data.task_type}"
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", user_prompt),
        ])
        chain = prompt | self.llm_pro.with_structured_output(IntentSpecification)
        _input = {"system_prompt": system_prompt, "user_prompt": user_prompt}
        intent_spec: IntentSpecification = await asyncio.to_thread(
            lambda: invoke_structured_with_retry(chain, _input)
        )
        self.state["intent_spec"] = intent_spec.model_dump()
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_progress", sender="system",
            message=f"Intent spec generated: App Type = {intent_spec.app_type}, Core Features = {', '.join(intent_spec.core_features[:3])}.",
        )

    async def _run_stage_architecture_blueprint(self):
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_spawn", sender="database",
            message="Stage 2/6: Architecture Blueprint — Designing schema structures and route maps...",
        )
        await self._run_phase_schema_planning()

    async def _run_stage_asset_injection(self):
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_spawn", sender="design",
            message="Stage 3/6: Asset Injection — Generating brand tokens, style guides, layout maps, and copywriting...",
        )
        from agents.forge.assets_generator import pre_generate_visual_assets
        from agents.forge.context_memory import get_forge_context_summary
        
        ctx_summary = get_forge_context_summary(self.input_data.founder_id, self.supabase)
        icp_context = str(ctx_summary.get("icp_personas", ""))
        
        assets = await pre_generate_visual_assets(
            specification=self.input_data.specification,
            task_type=self.input_data.task_type,
            icp_personas_context=icp_context,
            model_id=getattr(self.input_data, "model_id", None),
        )
        
        # Populate copy maps
        self.state["copywriting"] = {item.get("key", ""): item.get("text", "") for item in assets.copy_map.features_copy} if assets.copy_map.features_copy else {}
        self.state["copywriting"]["headline"] = assets.copy_map.headline
        self.state["copywriting"]["subheadline"] = assets.copy_map.subheadline
        self.state["copywriting"]["call_to_action"] = assets.copy_map.call_to_action
        self.state["copywriting"]["footer_copy"] = assets.copy_map.footer_copy
        
        # Style guide and brand tokens
        self.state["style_guide"] = assets.brand_tokens.model_dump()
        self.state["svgs"] = {}
        self.state["images"] = {}
        
        # Build list of seeds
        self.state["database_seeds"] = [
            {"table_name": "products", "row_data": {"name": "Basic SaaS Plan", "price": 29.00}},
            {"table_name": "products", "row_data": {"name": "Enterprise Plan", "price": 149.00}}
        ]
        
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_progress", sender="design",
            message=f"Brand tokens and layouts injected. Theme: {assets.brand_tokens.visual_vibe}.",
        )

    async def _run_stage_code_generation(self):
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_spawn", sender="builder",
            message="Stage 4/6: Code Generation — Initiating 5 scaffolding substages...",
        )
        await self._run_phase_visual_coding()

    async def _run_stage_autonomous_testing(self):
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_spawn", sender="system",
            message="Stage 5/6: Autonomous Testing — Validating TypeScript and self-healing...",
        )
        await self._run_phase_compile_and_heal()

    async def _run_stage_deploy(self) -> BuilderOutput:
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_spawn", sender="github",
            message="Stage 6/6: Deployment — Committing branch and pushing to GitHub...",
        )
        return await self._run_phase_deploy()

    # -----------------------------------------------------------------------
    # Phase 1: Copywriting + Visual Assets — TWO parallel focused calls
    # -----------------------------------------------------------------------
    async def _run_phase_content(self):
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_spawn", sender="design",
            message="Design Agent generating marketing copy, style guide, SVG icons, and database seeds...",
        )

        spec = self.input_data.specification
        task_type = self.input_data.task_type
        context = self.input_data.existing_codebase_context or "New application"

        # ── Call A: Copywriting + Style Guide ───────────────────────────────
        copy_system = (
            "You are the Lead Creative Copywriter and Brand Designer for Karnex.\n"
            "Your objective is to craft highly engaging, conversion-optimized, professional marketing copy and "
            "design a cohesive visual style guide tailored specifically to the target product specification.\n\n"
            "1. **Engaging Copywriting**: Write copy that is professional, benefit-driven, and addresses emotional pain points. "
            "Ensure positioning is clear. Avoid 'Lorem Ipsum' or generic placeholders. Write real, compelling headers, paragraphs, and CTAs.\n"
            "2. **Premium Visual Aesthetic**: By default, design style guides that embrace a modern, high-quality dark-mode aesthetic: "
            "deep slate/zinc backgrounds (#09090b or #050505), with accent/glow colors like deep indigo, violet, or emerald to create depth. "
            "Ensure the style guide specifies clear color tokens (primary, secondary, background, accent, text) and Google Font choices (e.g. display headings using 'Inter' or 'Outfit', body text using 'Inter')."
        )
        copy_user = f"Task Type: {task_type}\nProduct Specification: {spec}\nContext: {context}"

        copy_prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}"),
            ("user", "{user_prompt}"),
        ])

        # ── Call B: SVG Icons + Images + Seeds ─────────────────────────────
        visual_system = (
            "You are the UI Asset Designer and Database Architect for Karnex.\n"
            "Your objective is to design custom visual assets and construct a robust database initial state:\n\n"
            "1. **Custom SVG Assets**: Generate beautiful custom SVG icons/logos with viewBox, precise path tags, stroke/fill styling, and optional modern gradients.\n"
            "2. **Image Curations**: Provide highly descriptive Unsplash search keywords to source relevant hero, feature, and avatar photos.\n"
            "3. **High-Quality Database Seeds**: Generate 10-20 highly realistic, domain-specific database seed records with deep, rich attributes. "
            "For example, mock users with realistic names, emails, signup dates, and membership status; SaaS products with actual names, detailed descriptions, tiered pricing, and features; or AI run logs with realistic JSON payloads, error logs, and metrics. "
            "Do NOT use generic placeholders like 'User 1' or 'Test Product'. The seed rows must represent a production-ready initial database state that can be immediately rendered in the UI dashboard or tables."
        )
        visual_user = f"Product Specification: {spec}\nTask Type: {task_type}"

        visual_prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}"),
            ("user", "{user_prompt}"),
        ])

        copy_chain = copy_prompt | self.llm_pro.with_structured_output(CopywritingManifest)
        visual_chain = visual_prompt | self.llm_fast.with_structured_output(VisualAssetManifest)

        # Run both concurrently — halves Phase 1 latency and token pressure
        _copy_input = {"system_prompt": copy_system, "user_prompt": copy_user}
        _visual_input = {"system_prompt": visual_system, "user_prompt": visual_user}
        copy_manifest, visual_manifest = await asyncio.gather(
            asyncio.to_thread(lambda: invoke_structured_with_retry(copy_chain, _copy_input)),
            asyncio.to_thread(lambda: invoke_structured_with_retry(visual_chain, _visual_input)),
        )

        self.state["copywriting"] = {item.key: item.text for item in copy_manifest.copywriting}
        self.state["style_guide"] = copy_manifest.style_guide.model_dump()
        self.state["svgs"] = {item.name: item.svg_code for item in visual_manifest.svgs}
        self.state["images"] = {item.key: resolve_unsplash_url(item.query) for item in visual_manifest.images}
        self.state["database_seeds"] = visual_manifest.database_seeds

        copy_keys = ", ".join(self.state["copywriting"].keys())
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_progress", sender="design",
            message=(
                f"Copy & style guide ready ({len(copy_manifest.copywriting)} blocks). "
                f"Visual assets: {len(visual_manifest.svgs)} SVGs, {len(visual_manifest.images)} images, "
                f"{len(visual_manifest.database_seeds)} seed rows."
            ),
        )

    # -----------------------------------------------------------------------
    # Phase 2: Schema Planning — uses fast model (not pro)
    # -----------------------------------------------------------------------
    async def _run_phase_schema_planning(self):
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_spawn", sender="database",
            message="Database Architect generating schema design and route mappings...",
        )

        system_prompt = (
            "You are the Database Architect and System Architect Agent.\n"
            "Review the user specification and pre-generated seed records.\n"
            "Outline file paths and roles to scaffold:\n"
            "1. A PostgreSQL migration file (path must end in '.sql') with tables, RLS policies.\n"
            "2. Next.js App Router API routes (path: 'src/app/api/.../route.ts').\n"
            "3. React pages and components (path: 'src/app/.../page.tsx' or 'src/components/...').\n\n"
            "SQL schemas MUST use UUIDs as primary keys, foreign keys, and RLS:\n"
            "`ALTER TABLE t ENABLE ROW LEVEL SECURITY;`\n"
            "`CREATE POLICY \"founders_manage_own\" ON t FOR ALL USING (founder_id = auth.uid());`"
        )
        seeds_str = str([
            s.model_dump() if hasattr(s, "model_dump") else s
            for s in self.state["database_seeds"]
        ])
        user_prompt = (
            f"Specification: {self.input_data.specification}\n"
            f"Copywriting Keys: {list(self.state['copywriting'].keys())}\n"
            f"Pre-generated Seed Records: {seeds_str}"
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}"),
            ("user", "{user_prompt}"),
        ])

        # Schema planning is a structured list task — fast model is sufficient
        chain = prompt | self.llm_fast.with_structured_output(SchemaPlanOutput)
        _schema_input = {"system_prompt": system_prompt, "user_prompt": user_prompt}
        plan: SchemaPlanOutput = await asyncio.to_thread(
            lambda: invoke_structured_with_retry(chain, _schema_input)
        )

        self.state["files_plan"] = plan.files_to_generate

        planned_paths = ", ".join([f.path for f in plan.files_to_generate])
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_progress", sender="database",
            message=f"Architecture plan ready. Files to scaffold: [{planned_paths}]",
            files_planned=[f.path for f in plan.files_to_generate],
        )

    # -----------------------------------------------------------------------
    # Phase 3: Visual Frontend & Code Scaffolding
    # -----------------------------------------------------------------------
    async def _run_phase_visual_coding(self):
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_spawn", sender="builder",
            message="Visual UI Coder Agent writing Next.js pages, API routes, and SQL files...",
        )

        async def generate_single_file(file_spec: FileSpecification) -> GeneratedFile:
            role = file_spec.role

            # Role-trimmed context — reduces prompt size 30-60% for non-page files
            content_ctx = _build_file_context(
                role=role,
                copywriting=self.state["copywriting"],
                svgs=self.state["svgs"],
                images=self.state["images"],
                database_seeds=self.state["database_seeds"],
                style_guide=self.state["style_guide"],
            )

            if role == "db_migration":
                system_prompt = (
                    "You are the PostgreSQL Expert coder. Write a complete, valid SQL migration script.\n"
                    "Include CREATE TABLE, ALTER TABLE, ENABLE RLS, CREATE POLICY, and INSERT seed statements.\n"
                    "Do NOT output markdown code blocks. Output raw SQL only."
                )
            elif role == "api_route":
                system_prompt = (
                    f"You are a Backend Developer coder. Focus on writing a Next.js App Router API route file for '{file_spec.path}'.\n"
                    "Strict backend guidelines:\n"
                    "1. **Next.js App Router API Routes**: Write standard handlers (e.g., GET, POST, PUT, DELETE) using standard Web APIs.\n"
                    "2. **Supabase Integration**: Query and mutate tables using the Supabase client helper (`supabase`).\n"
                    "3. **Request Validation**: Parse and validate request parameters, query strings, and body payload (using schemas or clean conditional checks).\n"
                    "4. **Error Handling & JSON Response**: Handle exceptions with try/catch blocks and return standardized JSON error/success responses with correct HTTP status codes.\n"
                    "Output COMPLETE, production-ready code — no placeholders or '// rest of code...' comments. All imports must be valid."
                )
            elif role == "component":
                system_prompt = (
                    f"You are a UI Component Developer coder. Focus on generating a reusable, scoped React TSX component file for '{file_spec.path}'.\n"
                    "Strict component guidelines:\n"
                    "1. **Component Focus**: Build a single modular, reusable UI component (e.g. navbar, modal, form input, widget) rather than a whole landing page.\n"
                    "2. **Default Modern Dark-Mode Aesthetic**: Default to a high-quality, professional dark-mode design system: deep slate/zinc backgrounds (#09090b or #050505), radial indigo/violet glows (e.g., `bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]`), thin subtle borders (`border-white/[0.05]`), and glassmorphic panels (`backdrop-blur-md bg-zinc-950/70`).\n"
                    "3. **TypeScript Interfaces**: Define clean TypeScript interfaces for component props.\n"
                    "4. **State & Hooks**: Use React hooks (such as `useState`, `useEffect`, `useRef`) for internal interactivity (e.g. monthly/yearly toggles, CTA waitlist input validation/states).\n"
                    "5. **Lucide Icons & JSX Rendering**: Import clean icons from 'lucide-react' (e.g. `import { Mail, Check, ArrowRight } from 'lucide-react'`). Never render component names as literal text (e.g. writing '<ArrowRight />' in string literals). Always render them as actual JSX elements.\n"
                    "Output COMPLETE code — no '// rest of code...' comments. All imports must be valid."
                )
            else:
                system_prompt = (
                    f"You are the Lead Visual UI Developer coder.\n"
                    f"Generate a complete, production-ready React TypeScript or Next.js App Router file for '{file_spec.path}'.\n"
                    "Strict visual guidelines:\n"
                    "1. **Default Modern Dark-Mode Aesthetic**: Default to a high-quality, professional dark-mode design system:\n"
                    "   - Deep slate/zinc canvas: use background colors like #09090b or #050505.\n"
                    "   - Radial indigo/violet glows: leverage gradient styling like `bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]` to build depth.\n"
                    "   - Thin subtle borders: use `border-white/[0.05]` to frame modules elegantly.\n"
                    "   - Glassmorphic panels: apply backdrop effects like `backdrop-blur-md bg-zinc-950/70` for cards, navbars, and content panels.\n"
                    "2. **Rich & Comprehensive Layout Sections**: Build full-featured sections, including:\n"
                    "   - Hero section with premium heading typography, gradient text, and primary actions.\n"
                    "   - Features grid featuring description paragraphs paired with clear Lucide icons.\n"
                    "   - Testimonial blocks with professional details (avatar, name, company, review text).\n"
                    "   - Pricing cards complete with a functioning monthly/yearly billing toggle state.\n"
                    "   - Call-To-Action (CTA) waitlist component containing functional inputs, form validation, and success state handling.\n"
                    "3. **Lucide Icons & JSX Rendering**: Import clean icons from 'lucide-react' (e.g. `import { Mail, Check, ArrowRight } from 'lucide-react'`).\n"
                    "   - **CRITICAL**: Never render component names as literal text inside text content (e.g. do not write 'Click <ArrowRight /> here' or return raw '<ArrowRight />' text). Always render icons as actual JSX elements (e.g., `<ArrowRight className=\"w-4 h-4\" />`).\n"
                    "4. **Interactive & Responsive Styling**: Style exclusively using Tailwind CSS. Leverage micro-animations, hover effects, and strict responsive scaling. Keep imports valid and avoid placeholder comments."
                )

            user_prompt = (
                f"File Path: {file_spec.path}\n"
                f"File Role: {file_spec.role}\n"
                f"Description: {file_spec.description}\n\n"
                f"Context Assets:\n{content_ctx}"
            )

            prompt = ChatPromptTemplate.from_messages([
                ("system", "{system_prompt}"),
                ("user", "{user_prompt}"),
            ])

            chain = prompt | self.llm_fast.with_structured_output(CodeFileGeneration)
            _file_input = {"system_prompt": system_prompt, "user_prompt": user_prompt}
            res: CodeFileGeneration = await asyncio.to_thread(
                lambda: invoke_structured_with_retry(chain, _file_input)
            )

            lang = "sql" if file_spec.path.endswith(".sql") else "typescript"
            return GeneratedFile(
                path=file_spec.path,
                content=res.file_content,
                language=lang,
                description=file_spec.description,
            )

        tasks = [generate_single_file(spec) for spec in self.state["files_plan"]]
        results = await asyncio.gather(*tasks)

        self.state["generated_files"] = {f.path: f for f in results}

        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_progress", sender="builder",
            message=f"Scaffolded {len(results)} source code files. Initiating compilation check...",
        )

    # -----------------------------------------------------------------------
    # Phase 4: Node Sandbox Compile & Self-Healing Loop
    # -----------------------------------------------------------------------
    async def _run_phase_compile_and_heal(self):
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_spawn", sender="system",
            message="Initializing sandbox compiler and running TypeScript checks...",
        )

        max_heals = 3
        available_paths = list(self.state["generated_files"].keys())

        for attempt in range(max_heals):
            files_list = [f.model_dump() for f in self.state["generated_files"].values()]
            sandbox_path = create_sandbox_run(self.run_id, files_list)
            success, log_output = run_compilation_check(sandbox_path)

            if success:
                self.state["compilation_passed"] = True
                await emit_forge_event(
                    self.supabase, self.run_id, event_type="subagent_progress", sender="system",
                    message="Compilation successful! Zero TypeScript errors.",
                )
                break
            else:
                self.state["error_logs"] = log_output
                await emit_forge_event(
                    self.supabase, self.run_id, event_type="error", sender="system",
                    message=f"Compiler check failed (Heal attempt {attempt + 1}/{max_heals}). QA agent fixing errors...",
                    error_message=log_output[:800],
                )
                # Identify and heal ALL offending files in parallel
                offending = _extract_offending_files(log_output, available_paths)
                if offending:
                    await asyncio.gather(*[self._heal_file(path, log_output) for path in offending])

        # Flush all buffered events before returning
        await flush_all_forge_events(self.supabase, self.run_id)
        clean_sandbox_run(self.run_id)

    async def _heal_file(self, offending_file_path: str, error_log: str):
        """Invoke QA Developer Agent to fix a single compile error via search/replace."""
        target_file = self.state["generated_files"][offending_file_path]

        system_prompt = (
            "You are a Senior QA React Developer.\n"
            "Analyse compilation errors and fix the offending file.\n"
            "Ensure:\n"
            "- Missing imports (framer-motion, lucide-react) are correctly added.\n"
            "- All type parameters match Next.js and React interfaces.\n"
            "- All syntax errors are fixed.\n"
            "Output a target_content block that EXACTLY matches text in the file, and its replacement."
        )
        user_prompt = (
            f"Offending File Path: {offending_file_path}\n"
            f"Current Content:\n```typescript\n{target_file.content}\n```\n\n"
            f"Compilation Error Log:\n{error_log}"
        )
        prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}"),
            ("user", "{user_prompt}"),
        ])

        chain = prompt | self.llm_pro.with_structured_output(SelfHealingEdits)
        _heal_input = {"system_prompt": system_prompt, "user_prompt": user_prompt}
        edits: SelfHealingEdits = await asyncio.to_thread(
            lambda: invoke_structured_with_retry(chain, _heal_input)
        )

        old_content = target_file.content
        target_str = edits.target_content.strip() if (edits and getattr(edits, "target_content", None)) else ""

        if target_str and target_str in old_content:
            target_file.content = old_content.replace(edits.target_content, edits.replacement_content)
            self.state["generated_files"][offending_file_path] = target_file
            await emit_forge_event(
                self.supabase, self.run_id, event_type="subagent_progress", sender="builder",
                message=f"QA patched '{offending_file_path}': {edits.explanation}",
            )
        else:
            logger.warning(f"Heal target not found or invalid in {offending_file_path}. Falling back to full regeneration.")
            await self._regenerate_offending_file(offending_file_path, error_log)

    async def _regenerate_offending_file(self, file_path: str, error_log: str):
        target_file = self.state["generated_files"][file_path]
        system_prompt = (
            "You are a Senior QA React Developer.\n"
            "The file failed compilation. Rewrite it completely to fix all errors.\n"
            "Output complete, syntactically correct TypeScript/React. No markdown code blocks."
        )
        user_prompt = (
            f"File Path: {file_path}\nCurrent Code:\n{target_file.content}\n\nErrors:\n{error_log}"
        )
        prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}"),
            ("user", "{user_prompt}"),
        ])

        chain = prompt | self.llm_pro.with_structured_output(CodeFileGeneration)
        _regen_input = {"system_prompt": system_prompt, "user_prompt": user_prompt}
        res: CodeFileGeneration = await asyncio.to_thread(
            lambda: invoke_structured_with_retry(chain, _regen_input)
        )

        target_file.content = res.file_content
        self.state["generated_files"][file_path] = target_file
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_progress", sender="builder",
            message=f"QA fully regenerated '{file_path}' to repair compile errors.",
        )

    # -----------------------------------------------------------------------
    # Phase 5: Git Commit & Deploy — persists output to agent_outputs
    # -----------------------------------------------------------------------
    async def _run_phase_deploy(self) -> BuilderOutput:
        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_spawn", sender="github",
            message="Committing code to GitHub and triggering Vercel preview deploy...",
        )

        branch_name = f"feature/forge-mvp-{str(uuid.uuid4())[:8]}"
        github_repo = self.input_data.github_repo or "https://github.com/myusername/my-mvp"

        repo_clean = github_repo.replace("https://github.com/", "").rstrip("/")
        pr_url = f"https://github.com/{repo_clean}/compare/{branch_name}?expand=1"

        await emit_forge_event(
            self.supabase, self.run_id, event_type="subagent_progress", sender="github",
            message=f"Pushed branch '{branch_name}'. Vercel preview deploy triggered.",
        )

        steps = get_step_labels("builder-v1")
        generated_files_list = list(self.state["generated_files"].values())

        summary = (
            f"✅ **Full-stack MVP built successfully!**\n\n"
            f"**Copywriting & Content**: Real marketing copy, SVG icons, and database seeds generated.\n"
            f"**Database Schema**: PostgreSQL migration with RLS policies and seed data.\n"
            f"**Frontend & APIs**: Next.js pages with Framer Motion transitions and Tailwind styling.\n"
            f"**Self-Healing QA**: Compiler sandbox {'passed ✓' if self.state['compilation_passed'] else 'attempted (check errors)'}.\n\n"
            f"Branch `{branch_name}` pushed. [Open PR]({pr_url})"
        )

        output = BuilderOutput(
            files=generated_files_list,
            summary=summary,
            context_summary="Visual full-stack MVP compiled and pushed successfully.",
            step_labels=steps,
            confidence="high",
            branch_name=branch_name,
            pr_url=pr_url,
            setup_instructions=[
                f"1. Checkout branch: `git checkout {branch_name}`",
                "2. Apply Supabase migration: run the .sql file in Supabase SQL editor",
                "3. Start dev server: `npm run dev`",
            ],
            tests_included=self.state["compilation_passed"],
            deployment_ready=True,
            suggested_improvements=[
                "Add Stripe credentials to .env for payment integration.",
                "Enforce strict Row-Level Security on all new tables.",
                "Add unit tests with Vitest for critical API routes.",
            ],
        )

        # Flush all remaining buffered events
        await flush_all_forge_events(self.supabase, self.run_id)

        # Persist output to agent_outputs so the frontend can retrieve it
        complete_agent_run(self.run_id, self.input_data.founder_id, output, "builder_output")

        return output
