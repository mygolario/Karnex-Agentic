"""Karnex Forge Visual Asset Pre-Generator Pipeline.
Generates brand tokens, layout structures, and copy components before code generation.
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
from agents.forge.catalog import load_catalog


# Pydantic Schemas for Structured Asset Output
class BrandTokens(BaseModel):
    primary_color: str = Field(..., description="Hex value of primary color (e.g., #6366f1)")
    secondary_color: str = Field(..., description="Hex value of secondary color (e.g., #10b981)")
    accent_color: str = Field(..., description="Hex value of accent color (e.g., #f43f5e)")
    neutral_scale: List[str] = Field(..., description="5 hex shades from dark to light (e.g., Zinc scale)")
    font_display: str = Field(..., description="Google Font name for display/headings (e.g., Outfit, Inter)")
    font_body: str = Field(..., description="Google Font name for body sans text (e.g., Inter, Roboto)")
    border_radius: str = Field(..., description="Tailwind border radius class (e.g., rounded-xl, rounded-md)")
    spacing_scale: Dict[str, str] = Field(..., description="Standard spacing tokens mapping names to rems")
    shadow_tokens: Dict[str, str] = Field(..., description="CSS shadow configurations")


class ComponentItem(BaseModel):
    name: str = Field(..., description="e.g. Navigation, Hero, Features, Pricing")
    children: List[str] = Field(default_factory=list, description="Sub-elements nested inside")
    styles_description: str = Field(..., description="Layout constraints and alignment settings")


class LayoutBlueprint(BaseModel):
    app_type: str = Field(..., description="landing_page | dashboard | saas | marketplace | portfolio")
    pages: List[str] = Field(..., description="Page routes (e.g., ['/', '/pricing', '/dashboard'])")
    component_hierarchy: List[ComponentItem] = Field(..., description="Map of components and relationships")


class ComponentStyles(BaseModel):
    navigation: Dict[str, str] = Field(..., description="Style variables for navigation header")
    hero: Dict[str, str] = Field(..., description="Style variables for main landing showcase")
    elements: Dict[str, str] = Field(..., description="Style definitions for buttons, inputs, alerts, badges")


class CopyMap(BaseModel):
    headline: str = Field(..., description="High-converting benefit-focused header")
    subheadline: str = Field(..., description="Supporting copy explaining the main value prop")
    call_to_action: str = Field(..., description="Actionable button text")
    features_copy: List[Dict[str, str]] = Field(..., description="List of feature headers and descriptions")
    footer_copy: str = Field(..., description="Footer details including copy rights")


class CombinedAssetManifest(BaseModel):
    brand_tokens: BrandTokens
    layout_blueprint: LayoutBlueprint
    component_styles: ComponentStyles
    copy_map: CopyMap


async def pre_generate_visual_assets(
    specification: str,
    task_type: str,
    icp_personas_context: Optional[str] = None,
    model_id: Optional[str] = None,
) -> CombinedAssetManifest:
    """Pre-generates design system tokens, layouts, copy, and components matching target specifications."""
    catalog = load_catalog()
    entry = resolve_step_model(
        catalog,
        model_id=model_id,
        auto_model=True,
        max_mode=False,
        step_role="visual",
    )
    llm = model_from_catalog_entry(entry, step_role="visual")

    system_prompt = (
        "You are the Lead Visual Brand & System Designer for Karnex.\n"
        "Your task is to parse a startup's prompt specifications and target audience ICP profiles, "
        "and pre-generate a coherent visual design system, layout roadmap, component stylesheets, and "
        "engaging copywriting matching their brand voice before coding begins.\n\n"
        "Ensure color systems support a high-fidelity dark mode by default (e.g., slate background scales, vibrant primary and accent highlights). "
        "Align copy to target customer personas explicitly."
    )

    user_prompt = (
        f"Product Specification: {specification}\n"
        f"Task Type: {task_type}\n"
        f"Target ICP Context: {icp_personas_context or 'General SaaS audience'}\n"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", user_prompt),
    ])

    chain = prompt | llm.with_structured_output(CombinedAssetManifest)
    
    _input = {"system_prompt": system_prompt, "user_prompt": user_prompt}
    assets: CombinedAssetManifest = await asyncio.to_thread(
        lambda: invoke_structured_with_retry(chain, _input)
    )

    return assets
