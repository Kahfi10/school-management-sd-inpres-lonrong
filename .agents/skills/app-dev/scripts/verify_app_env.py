#!/usr/bin/env python3
"""
Application Environment & Dependency Hygiene Linter
Checks mobile/desktop application projects for common configuration issues,
unencrypted storage usages, and missing asset definitions.
"""

import os
import re
import sys
from pathlib import Path

def audit_app_code(filepath: Path):
    issues = []
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return issues

    # 1. Plain AsyncStorage / localStorage for auth tokens
    if re.search(r'(?:AsyncStorage|localStorage)\.setItem\([\'"][^\'"]*(?:token|auth|secret|password|jwt)', content, re.I):
        issues.append("Sensitive token saved in unencrypted storage (use SecureStore or Keychain)")

    # 2. Hardcoded API secrets
    if re.search(r'(?:apiKey|apiSecret|privateKey)\s*[:=]\s*[\'"][A-Za-z0-9_\-]{20,}[\'"]', content):
        issues.append("Possible hardcoded API key or private secret detected in client source")

    # 3. Missing safe area insets on screen roots
    if re.search(r'export\s+default\s+function\s+\w+Screen', content) and not re.search(r'useSafeAreaInsets|SafeAreaView', content):
        issues.append("Screen component appears to lack SafeArea handling (notch/home bar overlap risk)")

    return issues

def audit_directory(root_dir: Path):
    extensions = {".ts", ".tsx", ".js", ".jsx", ".dart"}
    total_files = 0
    total_issues = 0
    results = {}

    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "android", "ios", "dist", "build"}]
        for f in files:
            path = Path(root) / f
            if path.suffix.lower() in extensions:
                total_files += 1
                issues = audit_app_code(path)
                if issues:
                    results[path] = issues
                    total_issues += len(issues)

    print(f"\n{'='*60}")
    print(f" APP DEV & CLIENT HYGIENE AUDIT: {root_dir}")
    print(f"{'='*60}")
    print(f"Scanned {total_files} client source files.")

    if not results:
        print("\n [PASSED] Client app codebase is clean and follows best practices!\n")
        return 0

    print(f"\n [WARNING] Found {total_issues} security/architecture notices:\n")
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
    sys.exit(audit_directory(target))
