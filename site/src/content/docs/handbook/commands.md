---
title: Commands
description: Full CLI reference for Claude Rules.
sidebar:
  order: 3
---

## analyze

Score sections and propose splits. Shows which sections are core (stay inline) and which can be extracted.

```bash
claude-rules analyze [path]
claude-rules analyze .claude/CLAUDE.md
claude-rules analyze --memory    # also process MEMORY.md
```

**Output:** Section-by-section breakdown with priority classification, suggested filenames, keywords, and a budget estimate showing potential savings.

---

## split

Interactive extraction — approve each section before it's written to disk.

```bash
claude-rules split [path]
claude-rules split --dry-run       # preview without writing
claude-rules split --rules-dir .rules   # custom output directory
```

For each proposed extraction, you see:
- The section content (trimmed preview)
- Suggested filename and path
- Suggested keywords and priority
- Option to approve or skip

**Generates:**
- `.claude/rules/<id>.md` — rule file with frontmatter
- `.claude/rules/index.json` — dispatch table
- Updated `CLAUDE.md` — lean index with core rules and a routing table

---

## validate

Lint the rules directory for health issues.

```bash
claude-rules validate
claude-rules validate --rules-dir .rules
```

**Checks:**
- Missing file references (index points to file that doesn't exist)
- Orphaned rule files (file exists but isn't in index)
- Frontmatter drift (ID or priority in file doesn't match index)
- Empty keywords on domain rules
- Duplicate IDs

**Exit codes:** 0 = clean, 1 = issues found.

---

## stats

Token budget dashboard showing the physics of your system.

```bash
claude-rules stats
claude-rules stats --rules-dir .rules
```

**Output (split state):**

```
claude-rules stats

  CLAUDE.md (always loaded)
    Lines: 42    Tokens (est): 320

  Rule files (on-demand)
    github-actions           56 lines    680 tokens  domain
    shipping                 38 lines    310 tokens  domain
    ──────────────────────────────────────────────────────
    Total on-demand:         94 lines    990 tokens

  Budget
    Always loaded:         320 tokens
    On-demand total:       990 tokens
    Avg task load (est):   495 tokens
    Savings vs monolithic: 75%
```

If no split has been done yet, shows the monolithic file stats and suggests running `split`.

---

## Global Options

| Flag | Description |
|------|-------------|
| `--memory` | Also process MEMORY.md (analyze, split) |
| `--dry-run` | Preview without writing files (split) |
| `--rules-dir <path>` | Custom rules directory (default: `.claude/rules/`) |
| `--version` | Show version |
| `--help` | Show help |
