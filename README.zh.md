<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a> | <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <img src="logo.png" width="400" alt="claude-rules">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/claude-rules/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/claude-rules/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@mcptoolshop/claude-rules"><img src="https://img.shields.io/npm/v/@mcptoolshop/claude-rules" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
</p>

给你的 CLAUDE.md 瘦身。

`claude-rules` 是一个面向 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 的调度表生成器和指令文件优化器。它将臃肿的指令文件拆分为一个精简的路由索引（始终加载）和按主题划分的规则文件（按需加载），从而在每次会话中节省上下文 token。

## 问题

CLAUDE.md 文件会随着时间不断膨胀。每一行在每次会话中都会消耗 token，无论是否相关。一个 300 行的指令文件会悄悄地成为模型每次思考的负担。

## 解决方案

三层架构，没有歧义：

| 层级 | 文件 | 加载方式 |
|------|------|----------|
| 操作员控制台 | `CLAUDE.md` | 始终加载（精简索引） |
| 调度表 | `.claude/rules/index.json` | 始终加载（机器可读） |
| 规则文件 | `.claude/rules/*.md` | 按需加载 |

每个规则文件以 frontmatter 形式携带自身的路由元数据：

```markdown
---
id: github-actions
keywords: [ci, workflow, runner, dependabot]
patterns: [ci_pipeline]
priority: domain
triggers:
  task: true
  plan: true
  edit: false
---

# GitHub Actions Rules
CI minutes are finite...
```

当代理看到一个提及 "CI" 或 "workflow" 的任务时，它会读取相应的规则文件。其余的保持未加载状态。

## 安装

```bash
npm install -g @mcptoolshop/claude-rules
# 或
npx @mcptoolshop/claude-rules analyze
```

## 用法

### Analyze

评估你的 CLAUDE.md 各部分，查看哪些可以被提取：

```bash
claude-rules analyze
claude-rules analyze .claude/CLAUDE.md
```

```
File: .claude/CLAUDE.md  (258 lines, ~2388 tokens)

Keep inline (core): 4 sections
✓ (preamble)  2 lines
✓ Role  9 lines
✓ Guardian Self-Check  4 lines
✓ Document Delight  8 lines

Proposed extractions: 8 sections
  1. "GitHub Actions Rules" (L92-149, 58 lines, ~330 tokens)
     → .claude/rules/github-actions.md
     keywords: [github, actions, workflow, runner]

Budget estimate:
  Always loaded:    ~208 tokens (23 lines)
  On-demand:        ~2180 tokens (225 lines)
  Savings:          91% per session
```

### Split

交互式提取 — 在提取每个部分之前由你批准：

```bash
claude-rules split              # 交互模式
claude-rules split --dry-run    # 预览但不写入
```

每个提议的提取会显示预览、建议的文件名、关键词和优先级。你逐一批准或跳过。

### Validate

检查规则目录的健康状况：

```bash
claude-rules validate
```

检查项目：缺失的文件引用、孤立的规则文件、frontmatter 偏移、域规则上的空关键词、重复 ID。

### Stats

查看系统的运行数据：

```bash
claude-rules stats
```

```
claude-rules stats

  CLAUDE.md (always loaded)
    Lines: 42    Tokens (est): 320

  Rule files (on-demand)
    github-actions           56 lines    680 tokens  domain
    shipping                 38 lines    310 tokens  domain
    ownership                28 lines    210 tokens  domain
    ──────────────────────────────────────────────────────
    Total on-demand:        122 lines  1,200 tokens

  Budget
    Always loaded:         320 tokens
    On-demand total:     1,200 tokens
    Avg task load (est):   400 tokens
    Savings vs monolithic: 79%
```

## 优先级层级

| 层级 | 行为 | 示例 |
|------|------|------|
| `core` | 始终内联在 CLAUDE.md 中 | "test is right until proven otherwise" |
| `domain` | 当任务关键词匹配时加载 | 编辑 CI 时加载 GitHub Actions 规则 |
| `manual` | 从不自动加载，需要有意查阅 | 冷门的平台特殊情况 |

## 路由工作原理

代理在 CLAUDE.md 中看到调度表，两个信号引导它加载规则文件：

1. **语义匹配** — 任务提到 "publishing" 或 "CI"
2. **显式指令** — CLAUDE.md 说"在规划或编辑之前读取该规则文件"

这是面向代理循环的提示系统，不是魔法。关键词匹配与显式指令的组合使其可靠。

## 不变量

- 每个被提取的部分在 CLAUDE.md 中留下 1 行摘要
- 每个 `domain`/`manual` 规则都存在于 `index.json` 中
- 每个 `core` 规则保持内联（永远不会仅提取到文件中）
- Frontmatter 是真实数据源；`index.json` 是派生的
- 解析器仅在 ATX 标题（`##`、`###`）处分割

## 安全性

此工具仅读写本地的 markdown 和 JSON 文件。不会发起网络请求、收集遥测数据或访问任何外部服务。

### 威胁模型

| 威胁 | 缓解措施 |
|------|----------|
| 错误拆分导致的数据丢失 | 交互式批准 + `--dry-run` 模式 |
| 格式错误的规则文件 | `validate` 命令检测所有结构性问题 |
| 过时的索引 | `validate` 检测 frontmatter 和 index.json 之间的偏差 |

完整安全策略请参阅 [SECURITY.md](SECURITY.md)。

---

由 [MCP Tool Shop](https://mcp-tool-shop.github.io/) 构建
