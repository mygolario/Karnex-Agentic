"""Lightweight validation for generated Forge artifacts."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List

from agents.builder.schemas import GeneratedFile


@dataclass
class LintIssue:
    path: str
    message: str
    severity: str = "warning"


@dataclass
class LintResult:
    passed: bool
    issues: List[LintIssue] = field(default_factory=list)
    auto_fixed: List[str] = field(default_factory=list)


def _check_typescript(content: str, path: str) -> List[LintIssue]:
    issues: List[LintIssue] = []
    if content.count("{") != content.count("}"):
        issues.append(LintIssue(path, "Mismatched curly braces"))
    if content.count("(") != content.count(")"):
        issues.append(LintIssue(path, "Mismatched parentheses"))
    if "import React" in content and "export default" not in content and "export " not in content:
        issues.append(LintIssue(path, "React file missing export", "info"))
    if re.search(r"console\.log\(['\"]test", content):
        issues.append(LintIssue(path, "Debug console.log left in file"))
    return issues


def _check_brand_token_usage(content: str, path: str) -> List[LintIssue]:
    issues: List[LintIssue] = []
    # If it is a TSX/JSX or CSS file, check if there are hardcoded Hex colors (excluding neutral black/white)
    # like #3b82f6 instead of var(--primary) or tailwind classes
    hex_colors = re.findall(r"#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}", content)
    forbidden_colors = [c for c in hex_colors if c.lower() not in ("#fff", "#ffffff", "#000", "#000000", "#09090b", "#050505")]
    if forbidden_colors:
        issues.append(LintIssue(
            path,
            f"Hardcoded hex colors found: {', '.join(set(forbidden_colors))}. "
            "Use brand token CSS variables (e.g. var(--primary)) or Tailwind theme config.",
            "warning"
        ))
    return issues


def _check_responsive(content: str, path: str) -> List[LintIssue]:
    issues: List[LintIssue] = []
    # For UI components, verify presence of Tailwind responsive breakpoint classes (sm:, md:, lg:, xl:)
    if "className=" in content:
        breakpoints = re.findall(r"\b(sm|md|lg|xl|2xl):", content)
        if not breakpoints:
            issues.append(LintIssue(
                path,
                "No responsive Tailwind breakpoint classes (md:, lg:, etc.) found. "
                "Ensure layout scales properly on mobile viewports.",
                "warning"
            ))
    return issues


def _check_accessibility(content: str, path: str) -> List[LintIssue]:
    issues: List[LintIssue] = []
    # 1. Check for img elements without alt attributes
    img_matches = re.finditer(r"<img\b([^>]*)>", content)
    for m in img_matches:
        attrs = m.group(1)
        if "alt=" not in attrs:
            issues.append(LintIssue(
                path,
                "Image element is missing an 'alt' attribute for accessibility.",
                "warning"
            ))
            
    # 2. Check for input elements without labels/aria-labels
    input_matches = re.finditer(r"<input\b([^>]*)>", content)
    for m in input_matches:
        attrs = m.group(1)
        if "aria-label=" not in attrs and "id=" not in attrs and "placeholder=" not in attrs:
            issues.append(LintIssue(
                path,
                "Input element lacks descriptive identifier (aria-label, id, or placeholder).",
                "warning"
            ))
    return issues


def _check_missing_imports(content: str, path: str) -> List[LintIssue]:
    issues: List[LintIssue] = []
    # Check if framer-motion components like <motion.div> are used but framer-motion is not imported
    if "motion." in content and "framer-motion" not in content:
        issues.append(LintIssue(
            path,
            "Used framer-motion ('motion.') components but 'framer-motion' is not imported.",
            "error"
        ))
    
    # Check if lucide icons are referenced but lucide-react is not imported
    lucide_refs = re.findall(r"<([A-Z][a-zA-Z]+Icon|[A-Z][a-zA-Z]+)\b", content)
    # Filter common lucide icons or check if lucide-react is imported if we suspect icon use
    # A simpler heuristic: if Lucide icons (like Mail, User, ArrowRight) are used in JSX but lucide-react is missing
    common_icons = {"Mail", "User", "ArrowRight", "Check", "Plus", "Trash", "Edit", "Settings", "Search", "ChevronDown", "ChevronRight", "Lock"}
    used_icons = [icon for icon in lucide_refs if icon in common_icons]
    if used_icons and "lucide-react" not in content:
        issues.append(LintIssue(
            path,
            f"Referenced Lucide icon JSX tags ({', '.join(set(used_icons))}) but 'lucide-react' is not imported.",
            "error"
        ))
    return issues


def _check_sql(content: str, path: str) -> List[LintIssue]:
    issues: List[LintIssue] = []
    if "create table" in content.lower() and ";" not in content:
        issues.append(LintIssue(path, "SQL may be missing statement terminators"))
    return issues


def run_forge_linter(files: List[GeneratedFile]) -> LintResult:
    """Validate generated files; apply safe auto-fixes for brace mismatch."""
    issues: List[LintIssue] = []
    auto_fixed: List[str] = []

    for gf in files:
        if not gf.content or not gf.content.strip():
            issues.append(LintIssue(gf.path, "Empty file content", "error"))
            continue

        is_ts = gf.language in ("typescript", "javascript") or gf.path.endswith((".ts", ".tsx", ".js", ".jsx"))
        is_sql = gf.language == "sql" or gf.path.endswith(".sql")

        if is_ts:
            # Run typescript core checks
            file_issues = _check_typescript(gf.content, gf.path)
            for iss in file_issues:
                if iss.message == "Mismatched curly braces":
                    gf.content += "\n// Karnex linter: balanced closing brace\n}"
                    auto_fixed.append(gf.path)
                else:
                    issues.append(iss)
                    
            # Run brand token check
            issues.extend(_check_brand_token_usage(gf.content, gf.path))
            
            # Run responsiveness check
            issues.extend(_check_responsive(gf.content, gf.path))
            
            # Run accessibility check
            issues.extend(_check_accessibility(gf.content, gf.path))
            
            # Run missing imports check
            issues.extend(_check_missing_imports(gf.content, gf.path))

        elif is_sql:
            issues.extend(_check_sql(gf.content, gf.path))

    errors = [i for i in issues if i.severity == "error"]
    return LintResult(passed=len(errors) == 0, issues=issues, auto_fixed=auto_fixed)
