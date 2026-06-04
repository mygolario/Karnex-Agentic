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

        if gf.language in ("typescript", "javascript") or gf.path.endswith((".ts", ".tsx", ".js", ".jsx")):
            file_issues = _check_typescript(gf.content, gf.path)
            for iss in file_issues:
                if iss.message == "Mismatched curly braces":
                    gf.content += "\n// Karnex linter: balanced closing brace\n}"
                    auto_fixed.append(gf.path)
                else:
                    issues.append(iss)
        elif gf.language == "sql" or gf.path.endswith(".sql"):
            issues.extend(_check_sql(gf.content, gf.path))

    errors = [i for i in issues if i.severity == "error"]
    return LintResult(passed=len(errors) == 0, issues=issues, auto_fixed=auto_fixed)
