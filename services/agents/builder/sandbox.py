"""Sandbox manager for Next.js/React compilation checks and self-healing validation."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import List, Tuple

from shared.logger import logger

WORKSPACE_ROOT = Path("c:/Karnex-Agentic")
SANDBOX_DIR = WORKSPACE_ROOT / "sandbox"
BASE_TEMPLATE_DIR = SANDBOX_DIR / "base_template"


def ensure_base_template():
    """Create the base template and run npm install once to cache node_modules."""
    if not SANDBOX_DIR.exists():
        SANDBOX_DIR.mkdir(parents=True, exist_ok=True)

    if not BASE_TEMPLATE_DIR.exists():
        BASE_TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)

    package_json_content = """{
  "name": "karnex-sandbox-template",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "next build"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next": "^15.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "framer-motion": "^11.5.0",
    "lucide-react": "^0.439.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0-alpha.20",
    "postcss": "^8.4.38"
  }
}"""

    tsconfig_content = """{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}"""

    next_env_content = '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n'

    # Write files
    (BASE_TEMPLATE_DIR / "package.json").write_text(package_json_content, encoding="utf-8")
    (BASE_TEMPLATE_DIR / "tsconfig.json").write_text(tsconfig_content, encoding="utf-8")
    (BASE_TEMPLATE_DIR / "next-env.d.ts").write_text(next_env_content, encoding="utf-8")

    # Write a basic globals.css and layout.tsx
    src_app = BASE_TEMPLATE_DIR / "src" / "app"
    src_app.mkdir(parents=True, exist_ok=True)

    (src_app / "globals.css").write_text("@import 'tailwindcss';\n", encoding="utf-8")
    
    basic_layout = """import React from 'react'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
"""
    (src_app / "layout.tsx").write_text(basic_layout, encoding="utf-8")

    # Run npm install if node_modules doesn't exist
    node_modules_dir = BASE_TEMPLATE_DIR / "node_modules"
    if not node_modules_dir.exists():
        logger.info("Initializing sandbox base template node_modules (this may take a few seconds)...")
        try:
            # Use shell=True for windows npm resolution
            subprocess.run(
                "npm install --no-audit --no-fund",
                shell=True,
                cwd=str(BASE_TEMPLATE_DIR),
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE
            )
            logger.info("Sandbox base template node_modules cached successfully.")
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to install cached sandbox dependencies: {e.stderr.decode()}")


def create_sandbox_run(run_id: str, files: List[dict]) -> Path:
    """Create a temporary sandbox for this run, link node_modules, and write generated files."""
    ensure_base_template()

    run_dir = SANDBOX_DIR / f"run_{run_id}"
    if run_dir.exists():
        clean_sandbox_run(run_id)
    run_dir.mkdir(parents=True, exist_ok=True)

    # Copy template files (excluding node_modules)
    for path in BASE_TEMPLATE_DIR.iterdir():
        if path.name == "node_modules":
            continue
        if path.is_dir():
            shutil.copytree(path, run_dir / path.name)
        else:
            shutil.copy2(path, run_dir / path.name)

    # Link node_modules using junctions on Windows
    node_modules_target = run_dir / "node_modules"
    node_modules_source = BASE_TEMPLATE_DIR / "node_modules"
    
    if node_modules_source.exists():
        if sys.platform == "win32":
            # Command: cmd.exe /c mklink /J <target> <source>
            cmd = f'cmd.exe /c mklink /J "{node_modules_target}" "{node_modules_source}"'
            subprocess.run(cmd, shell=True, check=True)
        else:
            os.symlink(node_modules_source, node_modules_target, target_is_directory=True)

    # Write the generated files into the sandbox
    for f in files:
        file_path = run_dir / f.get("path")
        # Ensure parent directories exist
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(f.get("content"), encoding="utf-8")

    return run_dir


def run_compilation_check(run_dir: Path) -> Tuple[bool, str]:
    """Run TypeScript compiler checks on the sandbox workspace and return (success, log)."""
    try:
        # Determine robust command for local tsc execution
        tsc_cmd = "npx tsc --noEmit"
        if sys.platform == "win32":
            local_tsc = run_dir / "node_modules" / ".bin" / "tsc.cmd"
            if local_tsc.exists():
                tsc_cmd = f'"{local_tsc}" --noEmit'
            else:
                node_tsc = run_dir / "node_modules" / "typescript" / "bin" / "tsc"
                if node_tsc.exists():
                    tsc_cmd = f'node "{node_tsc}" --noEmit'
        else:
            local_tsc = run_dir / "node_modules" / ".bin" / "tsc"
            if local_tsc.exists():
                tsc_cmd = f'"{local_tsc}" --noEmit'

        # Run tsc compiler check
        res = subprocess.run(
            tsc_cmd,
            shell=True,
            cwd=str(run_dir),
            capture_output=True,
            text=True
        )
        if res.returncode == 0:
            return True, "Compilation passed successfully."
        else:
            return False, res.stdout + "\n" + res.stderr
    except Exception as e:
        return False, f"Sandbox execution runner error: {str(e)}"


def clean_sandbox_run(run_id: str):
    """Clean up the temporary run directory."""
    run_dir = SANDBOX_DIR / f"run_{run_id}"
    if run_dir.exists():
        # On Windows, we should remove the directory junction first so we don't delete base template's node_modules!
        node_modules_target = run_dir / "node_modules"
        if node_modules_target.exists():
            if sys.platform == "win32":
                subprocess.run(f'cmd.exe /c rmdir "{node_modules_target}"', shell=True)
            else:
                node_modules_target.unlink()
        shutil.rmtree(run_dir, ignore_errors=True)
