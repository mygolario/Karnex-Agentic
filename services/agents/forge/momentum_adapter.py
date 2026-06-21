"""Momentum-aware complexity adaptation for the Forge generation pipeline.

Adjusts app scope recommendations and warning notes based on founder momentum scores
to pace execution speed vs. features depth.
"""

from __future__ import annotations


def adapt_complexity(momentum_score: int, spec: str) -> tuple[str, str]:
    """Adapt target build specification and compile complexity instructions based on momentum.

    If momentum < 40, prepend a strict scope minimization warning.
    If momentum > 70, append a high-ambition roadmap extension suggestion.
    """
    if momentum_score < 40:
        note = (
            "[MOMENTUM-ADAPTER: LOW] Founder momentum is low. "
            "Simplify project files: strip secondary modules, minimize tables/routes, "
            "focus exclusively on shipping a clean landing and base user flow."
        )
        adapted_spec = (
            f"[MOMENTUM WARNING: SIMPLIFY WORKFLOW]\n"
            f"The founder's current execution momentum is low ({momentum_score}/100). "
            f"Keep things extremely concise. Avoid complex integrations. "
            f"Build the absolute smallest, fully-functional MVP version of this feature.\n\n"
            f"Raw Spec: {spec}"
        )
    elif momentum_score > 70:
        note = (
            "[MOMENTUM-ADAPTER: HIGH] Founder momentum is high. "
            "Suggest ambitious features, polished transitions, and deeper analytics."
        )
        adapted_spec = (
            f"[MOMENTUM BONUS: HIGH ENGINE EFFORT]\n"
            f"Founder momentum is outstanding ({momentum_score}/100). "
            f"Focus on visual polish, subtle micro-animations, and full error-logging validation.\n\n"
            f"Raw Spec: {spec}"
        )
    else:
        note = "[MOMENTUM-ADAPTER: NORMAL] Balanced pacing."
        adapted_spec = spec

    return adapted_spec, note


def get_complexity_recommendation(momentum_score: int) -> str:
    """Provide a written advice prompt snippet matching current momentum levels."""
    if momentum_score < 40:
        return (
            "Aim to ship in under 5 minutes. Deliver immediate utility. "
            "Avoid database joins or custom animations. Use default styles."
        )
    elif momentum_score > 70:
        return (
            "Include hover triggers, framer-motion card slide animations, "
            "and robust form validations. Structure code for scale."
        )
    return "Ensure clean layouts, functional forms, and robust types."
