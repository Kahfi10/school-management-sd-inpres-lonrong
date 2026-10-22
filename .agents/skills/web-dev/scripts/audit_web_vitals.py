#!/usr/bin/env python3
"""
Web Development Performance & SEO Linter
Scans HTML and component files for Core Web Vitals risks, missing SEO metadata,
and accessibility baseline violations.
"""

import os
import re
import sys
from pathlib import Path

def audit_html_file(filepath: Path):
    issues = []
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return issues

    # 1. Viewport Meta Tag
    if "<head" in content and not re.search(r'<meta[^>]+name=["\']viewport["\']', content, re.I):
        issues.append("Missing <meta name='viewport'> tag (breaks mobile responsiveness)")

    # 2. Title Tag
    if "<head" in content and not re.search(r'<title>[^<]+</title>', content, re.I):
        issues.append("Missing or empty <title> tag (SEO & a11y violation)")

    # 3. Heading Hierarchy
    h1_matches = len(re.findall(r'<h1[\s>]', content, re.I))
    if "<body" in content and h1_matches == 0:
        issues.append("Missing <h1> heading tag on page")
    elif h1_matches > 1:
        issues.append(f"Multiple <h1> headings detected ({h1_matches}); standard recommendation is 1 per page")

    # 4. Images Missing Alt Attributes
    img_tags = re.findall(r'<img\b[^>]*>', content, re.I)
    for img in img_tags:
        if not re.search(r'\balt=["\'][^"\']*["\']', img, re.I):
            issues.append(f"Image tag missing alt attribute: {img[:60]}...")
            break

    # 5. Images Missing Dimensions (CLS Risk)
    for img in img_tags:
        has_w = bool(re.search(r'\bwidth=', img, re.I))
        has_h = bool(re.search(r'\bheight=', img, re.I))
        has_style = bool(re.search(r'aspect-ratio', img, re.I))
        if not (has_w and has_h) and not has_style:
            issues.append(f"Image missing explicit width/height or aspect-ratio (CLS risk): {img[:60]}...")
            break

    # 6. Render-blocking scripts without defer or async
    script_tags = re.findall(r'<script\b[^>]*src=["\'][^"\']+["\'][^>]*>', content, re.I)
    for s in script_tags:
        if not re.search(r'\b(defer|async|type=["\']module["\'])', s, re.I):
            issues.append(f"Render-blocking external script found without defer/async: {s[:60]}...")
            break

    return issues

def audit_workspace(root_dir: Path):
    html_files = list(root_dir.rglob("*.html"))
    total_issues = 0
    results = {}

    for f in html_files:
        if any(part in f.parts for part in [".git", "node_modules", "dist", "build"]):
            continue
        file_issues = audit_html_file(f)
        if file_issues:
            results[f] = file_issues
            total_issues += len(file_issues)

    print(f"\n{'='*60}")
    print(f" WEB DEV & CORE WEB VITALS AUDIT: {root_dir}")
    print(f"{'='*60}")
    print(f"Scanned {len(html_files)} HTML files.")

    if not results:
        print("\n [PASSED] Web performance and SEO baseline audits fully cleared!\n")
        return 0

    print(f"\n [WARNING] Detected {total_issues} optimization opportunities:\n")
    for filepath, issues in results.items():
        rel = filepath.relative_to(root_dir) if filepath.is_relative_to(root_dir) else filepath
        print(f"-> {rel}:")
        for iss in issues:
            print(f"   • {iss}")
        print()

    print(f"{'='*60}")
    return 1

if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    sys.exit(audit_workspace(target))
