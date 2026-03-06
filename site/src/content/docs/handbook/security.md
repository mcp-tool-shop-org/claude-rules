---
title: Security
description: Attack surface analysis and threat model for Claude Rules.
sidebar:
  order: 4
---

## Attack Surface

Claude Rules is a local CLI tool with a narrow attack surface:

- **No network access** — makes no HTTP requests, opens no sockets
- **No code execution** — no `eval`, `Function()`, or dynamic imports
- **No telemetry** — collects and transmits nothing
- **Scoped file access** — writes only to `.claude/rules/` and CLAUDE.md
- **Interactive approval** — every extraction requires user confirmation

## Threat Model

| Threat | Mitigation |
|--------|------------|
| Data loss from bad split | Interactive approval + `--dry-run` mode |
| Malformed rule files | `validate` command catches all structural issues |
| Stale index | `validate` detects drift between frontmatter and index.json |
| Arbitrary file writes | Writes scoped to `.claude/rules/` directory only |

## Reporting a Vulnerability

If you discover a security issue, please email **64996768+mcp-tool-shop@users.noreply.github.com** with:

- Description of the vulnerability
- Steps to reproduce
- Impact assessment

We will respond within 7 days and aim to release a fix within 14 days for confirmed issues.
