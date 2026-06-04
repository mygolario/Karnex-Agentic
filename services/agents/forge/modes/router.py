"""Mode detection and routing for Karnex Forge."""

from __future__ import annotations

import re
from typing import Literal, Optional, Tuple

from pydantic import BaseModel, Field

ForgeMode = Literal["plan", "ask", "debug", "build", "auto"]


class ModeClassification(BaseModel):
    mode: str = Field(..., description="plan | ask | debug | build")
    confidence: str = Field("medium", description="low | medium | high")
    reason: str = Field("", description="Short reason for UI chip")


_STACK_TRACE_RE = re.compile(
    r"(Traceback \(most recent|Error:|TypeError:|ReferenceError:|at .+\(.+:\d+:\d+\))",
    re.IGNORECASE,
)


def detect_forge_mode(
    specification: str,
    declared_mode: Optional[str] = "auto",
) -> Tuple[str, ModeClassification]:
    """Return resolved mode and classification metadata."""
    spec = specification.strip()
    mode_in = (declared_mode or "auto").lower()

    if mode_in in ("plan", "ask", "debug", "build"):
        return mode_in, ModeClassification(
            mode=mode_in,
            confidence="high",
            reason="User-selected mode",
        )

    lower = spec.lower()
    if _STACK_TRACE_RE.search(spec) or lower.startswith("error:") or "stack trace" in lower:
        return "debug", ModeClassification(
            mode="debug",
            confidence="high",
            reason="Detected error/stack trace",
        )

    if any(
        p in lower
        for p in (
            "scan codebase",
            "find bugs",
            "proactive",
            "static analysis",
            "lint the project",
        )
    ):
        return "debug", ModeClassification(
            mode="debug",
            confidence="medium",
            reason="Proactive/debug scan request",
        )

    if any(
        p in lower
        for p in (
            "how does",
            "what is",
            "explain",
            "why ",
            "should i",
            "?",
            "help me understand",
        )
    ) and not any(
        p in lower
        for p in ("build", "create", "scaffold", "implement", "generate", "add ")
    ):
        return "ask", ModeClassification(
            mode="ask",
            confidence="medium",
            reason="Question or explanation request",
        )

    if any(
        p in lower
        for p in (
            "plan ",
            "architecture",
            "file list",
            "before you code",
            "outline",
            "roadmap for this feature",
        )
    ):
        return "plan", ModeClassification(
            mode="plan",
            confidence="medium",
            reason="Planning request",
        )

    if any(
        p in lower
        for p in (
            "hello",
            "hi ",
            "hey",
            "thanks",
            "approve",
            "looks good",
            "go ahead",
        )
    ) and len(spec) < 120:
        return "ask", ModeClassification(
            mode="ask",
            confidence="low",
            reason="Conversational message",
        )

    return "build", ModeClassification(
        mode="build",
        confidence="medium",
        reason="Build/scaffold intent",
    )
