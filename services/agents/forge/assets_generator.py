"""Karnex Forge Visual Asset Pre-Generator Pipeline.
Generates brand tokens, layout structures, and copy components before code generation.

4-step pipeline:
  Step A — Brand Token Extraction
  Step B — Layout Blueprint Generation
  Step C — Component Style Pre-Generation
  Step D — Copy & Microcopy
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate

from shared.openrouter_client import (
    invoke_structured_with_retry,
    model_from_catalog_entry,
    resolve_step_model,
)
from shared.logger import logger
from shared.supabase_client import get_supabase_admin
from agents.forge.catalog import load_catalog


# ---------------------------------------------------------------------------
# Pydantic Schemas for Structured Asset Output
# ---------------------------------------------------------------------------

class BrandTokens(BaseModel):
    primary_color: str = Field(..., description="Hex value of primary color (e.g., #6366f1)")
    secondary_color: str = Field(..., description="Hex value of secondary color (e.g., #10b981)")
    accent_color: str = Field(..., description="Hex value of accent color (e.g., #f43f5e)")
    neutral_scale: List[str] = Field(..., description="5 hex shades from dark to light (e.g., Zinc scale)")
    font_display: str = Field(..., description="Google Font name for display/headings (e.g., Outfit, Inter)")
    font_body: str = Field(..., description="Google Font name for body sans text (e.g., Inter, Roboto)")
    border_radius: str = Field(..., description="Tailwind border radius class (e.g., rounded-xl, rounded-md)")
    spacing_scale: Dict[str, str] = Field(..., description="Standard spacing tokens mapping names to rems")
    shadow_tokens: Dict[str, str] = Field(..., description="CSS shadow configurations (sm, md, lg, xl)")
    border_radii: Dict[str, str] = Field(
        default_factory=lambda: {"sm": "0.25rem", "md": "0.5rem", "lg": "0.75rem", "xl": "1rem"},
        description="Border radius token scale",
    )
    visual_vibe: str = Field(..., description="One-sentence visual vibe (e.g., 'Clean futuristic cyber-grid with purple glows')")
    business_type: str = Field("", description="Detected business type from specification")
    target_audience: str = Field("", description="Target audience summary")
    tone: str = Field("professional", description="Brand tone: professional, playful, bold, minimal, etc.")


class ComponentItem(BaseModel):
    name: str = Field(..., description="e.g. Navigation, Hero, Features, Pricing")
    children: List[str] = Field(default_factory=list, description="Sub-elements nested inside")
    styles_description: str = Field(..., description="Layout constraints and alignment settings")


class LayoutBlueprint(BaseModel):
    app_type: str = Field(..., description="landing_page | dashboard | saas | marketplace | portfolio")
    layout_archetype: str = Field(
        "hero-landing",
        description="sidebar-dashboard | hero-landing | split-panel | card-grid | wizard-flow | kanban",
    )
    pages: List[str] = Field(..., description="Page routes (e.g., ['/', '/pricing', '/dashboard'])")
    route_map: Dict[str, str] = Field(
        default_factory=dict,
        description="Route path to page component mapping",
    )
    component_hierarchy: List[ComponentItem] = Field(..., description="Map of components and relationships")


class ComponentStyleSpec(BaseModel):
    """Style specification for a single component type."""
    base_classes: str = Field(..., description="Tailwind classes for default state")
    hover_classes: str = Field("", description="Tailwind classes for hover state")
    loading_state: str = Field("", description="Description of loading state UI")
    error_state: str = Field("", description="Description of error state UI")
    empty_state: str = Field("", description="Description of empty state UI")


class ComponentStyles(BaseModel):
    navigation: Dict[str, str] = Field(..., description="Style variables for navigation header")
    hero: Dict[str, str] = Field(..., description="Style variables for main landing showcase")
    elements: Dict[str, str] = Field(..., description="Style definitions for buttons, inputs, alerts, badges")
    cards: ComponentStyleSpec = Field(
        default_factory=lambda: ComponentStyleSpec(base_classes="rounded-xl border p-6"),
        description="Card component style spec",
    )
    tables: ComponentStyleSpec = Field(
        default_factory=lambda: ComponentStyleSpec(base_classes="w-full text-sm"),
        description="Table component style spec",
    )
    forms: ComponentStyleSpec = Field(
        default_factory=lambda: ComponentStyleSpec(base_classes="space-y-4"),
        description="Form component style spec",
    )
    modals: ComponentStyleSpec = Field(
        default_factory=lambda: ComponentStyleSpec(base_classes="fixed inset-0 z-50"),
        description="Modal component style spec",
    )
    alerts: ComponentStyleSpec = Field(
        default_factory=lambda: ComponentStyleSpec(base_classes="rounded-lg p-4 border"),
        description="Alert component style spec",
    )


class CopyMap(BaseModel):
    headline: str = Field(..., description="High-converting benefit-focused header")
    subheadline: str = Field(..., description="Supporting copy explaining the main value prop")
    call_to_action: str = Field(..., description="Actionable button text")
    features_copy: List[Dict[str, str]] = Field(..., description="List of feature headers and descriptions")
    footer_copy: str = Field(..., description="Footer details including copy rights")
    secondary_ctas: List[str] = Field(default_factory=list, description="Secondary CTA texts (e.g., 'Learn more', 'See demo')")
    microcopy: Dict[str, str] = Field(
        default_factory=dict,
        description="UI microcopy: form labels, tooltips, empty states, error messages",
    )
    meta_title: str = Field("", description="SEO meta title")
    meta_description: str = Field("", description="SEO meta description")


class CombinedAssetManifest(BaseModel):
    brand_tokens: BrandTokens
    layout_blueprint: LayoutBlueprint
    component_styles: ComponentStyles
    copy_map: CopyMap


# ---------------------------------------------------------------------------
# Step A — Brand Token Extraction (separate LLM call)
# ---------------------------------------------------------------------------

async def _generate_brand_tokens(
    specification: str,
    task_type: str,
    icp_context: Optional[str],
    model_id: Optional[str],
) -> BrandTokens:
    """Extract brand identity tokens from specification and ICP."""
    catalog = load_catalog()
    entry = resolve_step_model(
        catalog, model_id=model_id, auto_model=True, max_mode=False, step_role="visual",
    )
    llm = model_from_catalog_entry(entry, step_role="visual")

    system_prompt = (
        "You are a Brand Identity Designer. Extract visual brand tokens from the startup specification.\n"
        "Analyze: business type, target audience, and desired tone.\n"
        "Generate a cohesive color system (primary, secondary, accent, 5-shade neutral scale),\n"
        "Google Font pairings (display + body), spacing scale, border radius tokens, and shadow tokens.\n"
        "Default to dark-mode-friendly palettes with vibrant highlights."
    )
    user_prompt = (
        f"Specification: {specification}\n"
        f"Task Type: {task_type}\n"
        f"Target ICP: {icp_context or 'General SaaS audience'}\n"
    )

    prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("user", user_prompt)])
    chain = prompt | llm.with_structured_output(BrandTokens)
    _input = {"system_prompt": system_prompt, "user_prompt": user_prompt}

    return await asyncio.to_thread(lambda: invoke_structured_with_retry(chain, _input))


# ---------------------------------------------------------------------------
# Step B — Layout Blueprint Generation (separate LLM call)
# ---------------------------------------------------------------------------

async def _generate_layout_blueprint(
    specification: str,
    task_type: str,
    brand_tokens: BrandTokens,
    model_id: Optional[str],
) -> LayoutBlueprint:
    """Determine app type and generate layout archetype with component hierarchy."""
    catalog = load_catalog()
    entry = resolve_step_model(
        catalog, model_id=model_id, auto_model=True, max_mode=False, step_role="visual",
    )
    llm = model_from_catalog_entry(entry, step_role="visual")

    system_prompt = (
        "You are a UI Architect. Based on the specification and brand tokens, determine:\n"
        "1. App type (landing_page, dashboard, saas, marketplace, portfolio)\n"
        "2. Layout archetype (sidebar-dashboard, hero-landing, split-panel, card-grid, wizard-flow, kanban)\n"
        "3. Full page list with routes\n"
        "4. Component hierarchy map showing parent-child relationships"
    )
    user_prompt = (
        f"Specification: {specification}\n"
        f"Task Type: {task_type}\n"
        f"Brand Vibe: {brand_tokens.visual_vibe}\n"
        f"Business Type: {brand_tokens.business_type}\n"
    )

    prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("user", user_prompt)])
    chain = prompt | llm.with_structured_output(LayoutBlueprint)
    _input = {"system_prompt": system_prompt, "user_prompt": user_prompt}

    return await asyncio.to_thread(lambda: invoke_structured_with_retry(chain, _input))


# ---------------------------------------------------------------------------
# Step C — Component Style Pre-Generation (separate LLM call)
# ---------------------------------------------------------------------------

async def _generate_component_styles(
    specification: str,
    brand_tokens: BrandTokens,
    layout_blueprint: LayoutBlueprint,
    model_id: Optional[str],
) -> ComponentStyles:
    """Pre-generate component style specifications using brand tokens and layout."""
    catalog = load_catalog()
    entry = resolve_step_model(
        catalog, model_id=model_id, auto_model=True, max_mode=False, step_role="visual",
    )
    llm = model_from_catalog_entry(entry, step_role="visual")

    system_prompt = (
        "You are a Component Style Engineer. Using the brand tokens and layout archetype,\n"
        "pre-generate Tailwind CSS style specs for: navigation, hero, cards, tables, forms, modals, alerts.\n"
        "Include loading, error, and empty state descriptions for each interactive component.\n"
        "Use the brand color tokens as CSS variable references (e.g., var(--primary))."
    )
    user_prompt = (
        f"Brand Tokens: primary={brand_tokens.primary_color}, secondary={brand_tokens.secondary_color}, "
        f"accent={brand_tokens.accent_color}, radius={brand_tokens.border_radius}\n"
        f"Layout: {layout_blueprint.layout_archetype} for {layout_blueprint.app_type}\n"
        f"Pages: {', '.join(layout_blueprint.pages)}\n"
    )

    prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("user", user_prompt)])
    chain = prompt | llm.with_structured_output(ComponentStyles)
    _input = {"system_prompt": system_prompt, "user_prompt": user_prompt}

    return await asyncio.to_thread(lambda: invoke_structured_with_retry(chain, _input))


# ---------------------------------------------------------------------------
# Step D — Copy & Microcopy (separate LLM call)
# ---------------------------------------------------------------------------

async def _generate_copy_map(
    specification: str,
    task_type: str,
    brand_tokens: BrandTokens,
    layout_blueprint: LayoutBlueprint,
    icp_context: Optional[str],
    model_id: Optional[str],
) -> CopyMap:
    """Generate placeholder copy using ICP context for tone and targeting."""
    catalog = load_catalog()
    entry = resolve_step_model(
        catalog, model_id=model_id, auto_model=True, max_mode=False, step_role="visual",
    )
    llm = model_from_catalog_entry(entry, step_role="visual")

    system_prompt = (
        "You are a Conversion Copywriter for startups. Generate high-converting copy:\n"
        "- Headline: benefit-focused, not feature-focused\n"
        "- Subheadline: expand on the value proposition\n"
        "- CTA: action-oriented button text\n"
        "- Feature descriptions: concise with clear benefits\n"
        "- Microcopy: form labels, tooltips, empty states, error messages\n"
        "- SEO: meta title and description\n"
        "Match the tone to the target audience ICP."
    )
    user_prompt = (
        f"Specification: {specification}\n"
        f"Task Type: {task_type}\n"
        f"Brand Tone: {brand_tokens.tone}\n"
        f"App Type: {layout_blueprint.app_type}\n"
        f"Pages: {', '.join(layout_blueprint.pages)}\n"
        f"ICP Context: {icp_context or 'General startup audience'}\n"
    )

    prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("user", user_prompt)])
    chain = prompt | llm.with_structured_output(CopyMap)
    _input = {"system_prompt": system_prompt, "user_prompt": user_prompt}

    return await asyncio.to_thread(lambda: invoke_structured_with_retry(chain, _input))


# ---------------------------------------------------------------------------
# Coherence validation
# ---------------------------------------------------------------------------

def validate_asset_coherence(manifest: CombinedAssetManifest) -> List[str]:
    """Validate that the asset manifest is internally coherent.

    Returns list of warning strings (empty = all good).
    """
    warnings: List[str] = []

    bt = manifest.brand_tokens
    # Check color format
    for color_name in ("primary_color", "secondary_color", "accent_color"):
        color = getattr(bt, color_name, "")
        if not color.startswith("#") or len(color) not in (4, 7):
            warnings.append(f"Brand token {color_name} has invalid hex format: {color}")

    # Check neutral scale
    if len(bt.neutral_scale) < 5:
        warnings.append(f"Neutral scale has {len(bt.neutral_scale)} shades, expected 5")

    # Check layout has at least one page
    lb = manifest.layout_blueprint
    if not lb.pages:
        warnings.append("Layout blueprint has no pages defined")

    # Check copy has features
    cm = manifest.copy_map
    if not cm.features_copy:
        warnings.append("Copy map has no feature descriptions")

    if not cm.headline or len(cm.headline) < 5:
        warnings.append("Headline is missing or too short")

    return warnings


# ---------------------------------------------------------------------------
# Save to forge_assets table
# ---------------------------------------------------------------------------

async def save_assets_to_db(
    project_id: str,
    manifest: CombinedAssetManifest,
    version: int = 1,
    supabase: Any = None,
) -> None:
    """Persist the full asset manifest to forge_assets table."""
    sb = supabase or get_supabase_admin()
    try:
        sb.table("forge_assets").upsert({
            "project_id": project_id,
            "brand_tokens": manifest.brand_tokens.model_dump(),
            "layout_blueprint": manifest.layout_blueprint.model_dump(),
            "component_styles": manifest.component_styles.model_dump(),
            "content_map": manifest.copy_map.model_dump(),
            "version": version,
        }, on_conflict="project_id").execute()
    except Exception as e:
        logger.warning(f"Could not save assets to forge_assets for project {project_id}: {e}")


# ---------------------------------------------------------------------------
# Main pipeline entry point (4-step sequential)
# ---------------------------------------------------------------------------

async def pre_generate_visual_assets(
    specification: str,
    task_type: str,
    icp_personas_context: Optional[str] = None,
    model_id: Optional[str] = None,
    project_id: Optional[str] = None,
    supabase: Any = None,
) -> CombinedAssetManifest:
    """Pre-generates design system tokens, layouts, copy, and components matching target specifications.

    4-step pipeline with separate LLM calls:
      A. Brand Token Extraction
      B. Layout Blueprint Generation
      C. Component Style Pre-Generation
      D. Copy & Microcopy Generation
    """
    # Step A — Brand Tokens
    brand_tokens = await _generate_brand_tokens(
        specification, task_type, icp_personas_context, model_id,
    )

    # Step B — Layout Blueprint
    layout_blueprint = await _generate_layout_blueprint(
        specification, task_type, brand_tokens, model_id,
    )

    # Step C — Component Styles
    component_styles = await _generate_component_styles(
        specification, brand_tokens, layout_blueprint, model_id,
    )

    # Step D — Copy Map
    copy_map = await _generate_copy_map(
        specification, task_type, brand_tokens, layout_blueprint,
        icp_personas_context, model_id,
    )

    manifest = CombinedAssetManifest(
        brand_tokens=brand_tokens,
        layout_blueprint=layout_blueprint,
        component_styles=component_styles,
        copy_map=copy_map,
    )

    # Validate coherence
    coherence_warnings = validate_asset_coherence(manifest)
    if coherence_warnings:
        for w in coherence_warnings:
            logger.warning(f"Asset coherence issue: {w}")

    # Save to DB if project_id provided
    if project_id:
        await save_assets_to_db(project_id, manifest, supabase=supabase)

    return manifest
