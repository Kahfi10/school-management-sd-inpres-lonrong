#!/usr/bin/env python3
"""
Anti-Slop AI Code Scanner
Scans source files for AI-generated code slop: placeholders, lazy truncations,
empty error handlers, generic placeholder URLs, and Lorem Ipsum.
"""

import os
import re
import sys
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SLOP_PATTERNS = [
    (r"//\s*\.\.\.", "Truncation ellipsis ('// ...')"),
    (r"/\*\s*\.\.\.\s*\*/", "Block truncation ellipsis ('/* ... */')"),
    (r"//\s*(?:TODO|FIXME):?\s*(?:implement|add\s+later|fill\s+in)", "Unimplemented placeholder comment"),
    (r"placeholder\.com", "Generic placeholder image URL"),
    (r"Lorem\s+ipsum", "Unreplaced Lorem Ipsum mock copy"),
    (r"catch\s*\([^)]*\)\s*\{\s*\}", "Silent/empty catch block"),
    (r"catch\s*\([^)]*\)\s*\{\s*//\s*TODO", "Empty catch block with TODO"),
    (r"throw\s+new\s+Error\([\"'](?:Not implemented|TODO)[\"']\)", "Not implemented stub exception"),
    (r"(?:const|let|var)\s+\w+\s*=\s*\[\s*1\s*,\s*2\s*,\s*3\s*\]", "Lazy [1, 2, 3] numeric array"),
]

IGNORED_DIRS = {
    ".git", "node_modules", "dist", "build", ".next", ".nuxt", ".output",
    "venv", ".venv", "__pycache__", ".turbo", ".cache", ".agents", "skills",
    "references", ".gemini"
}

IGNORED_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff",
    ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".pdf", ".zip", ".lock",
    ".md", ".markdown", ".txt"
}

def scan_file(filepath: Path):
    findings = []
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return findings

    lines = content.splitlines()
    for line_idx, line in enumerate(lines, start=1):
        for pattern, label in SLOP_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                # Clean snippet for safe printing
                clean_snippet = line.strip().encode("ascii", errors="replace").decode("ascii")
                findings.append((line_idx, label, clean_snippet))
    return findings

def scan_directory(target_dir: Path):
    total_files = 0
    total_findings = 0
    results = {}

    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        for f in files:
            path = Path(root) / f
            if path.suffix.lower() in IGNORED_EXTS:
                continue
            total_files += 1
            file_findings = scan_file(path)
            if file_findings:
                results[path] = file_findings
                total_findings += len(file_findings)

    print(f"\n{'='*60}")
    print(f" ANTI-SLOP AI SCAN REPORT: {target_dir}")
    print(f"{'='*60}")
    print(f"Scanned {total_files} code files.")

    if not results:
        print("\n [PASSED] Zero AI Slop detected! Codebase is pristine and craftsman-grade.\n")
        return 0

    print(f"\n [ALERT] Found {total_findings} slop occurrences across {len(results)} files:\n")
    for filepath, items in results.items():
        rel_path = filepath.relative_to(target_dir) if filepath.is_relative_to(target_dir) else filepath
        print(f"-> {rel_path} ({len(items)} issues):")
        for line_no, label, snippet in items:
            print(f"   Line {line_no:4d} | {label}: {snippet[:80]}")
        print()

    print(f"{'='*60}")
    return 1

if __name__ == "__main__":
    scan_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    sys.exit(scan_directory(scan_path))
