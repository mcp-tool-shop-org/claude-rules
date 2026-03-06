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

CLAUDE.md をダイエットしよう。

`claude-rules` は [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 向けのディスパッチテーブルジェネレーターおよび命令ファイルオプティマイザーです。肥大化した命令ファイルを、小さなルーティングインデックス（常時ロード）とトピック別のルールファイル（オンデマンドロード）に分割し、セッションごとのコンテキストトークンを節約します。

## 問題

CLAUDE.md ファイルは時間とともに肥大化します。すべての行が毎セッションでトークンを消費します。関連があろうとなかろうと。300行の命令ファイルは、モデルのすべての思考に対する静かな税金になります。

## 解決策

3つのレイヤー、曖昧さなし:

| レイヤー | ファイル | ロード |
|----------|----------|--------|
| オペレーターコンソール | `CLAUDE.md` | 常時（軽量インデックス） |
| ディスパッチテーブル | `.claude/rules/index.json` | 常時（機械可読） |
| ルールファイル | `.claude/rules/*.md` | オンデマンド |

各ルールファイルは、frontmatter としてルーティングメタデータを保持します:

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

エージェントが「CI」や「workflow」に言及するタスクを検出すると、該当するルールファイルを読み込みます。残りはロードされません。

## インストール

```bash
npm install -g @mcptoolshop/claude-rules
# または
npx @mcptoolshop/claude-rules analyze
```

## 使い方

### Analyze

CLAUDE.md のセクションをスコアリングし、抽出可能な部分を確認:

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

対話型の抽出 — 各セクションを抽出する前に承認します:

```bash
claude-rules split              # 対話モード
claude-rules split --dry-run    # 書き込みなしのプレビュー
```

各抽出候補はプレビュー、推奨ファイル名、キーワード、優先度を表示します。それぞれを承認またはスキップします。

### Validate

ルールディレクトリの健全性をチェック:

```bash
claude-rules validate
```

チェック項目: ファイル参照の欠落、孤立したルールファイル、frontmatter の乖離、ドメインルールの空キーワード、重複 ID。

### Stats

システムの物理を確認:

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

## 優先度レベル

| レベル | 動作 | 例 |
|--------|------|-----|
| `core` | 常に CLAUDE.md にインライン | "test is right until proven otherwise" |
| `domain` | タスクのキーワードが一致したときにロード | CI 編集時の GitHub Actions ルール |
| `manual` | 自動ロードされない、意図的な参照 | 知られていないプラットフォームの特殊事情 |

## ルーティングの仕組み

エージェントは CLAUDE.md のディスパッチテーブルを参照し、2つのシグナルがルールファイルの読み込みを促します:

1. **セマンティックマッチ** — タスクが "publishing" や "CI" に言及している
2. **明示的な指示** — CLAUDE.md が「計画や編集の前にそのルールファイルを読め」と指示している

これはエージェントループ向けのヒントシステムであり、魔法ではありません。キーワードマッチングと明示的な指示の組み合わせにより、信頼性が確保されます。

## 不変条件

- 抽出された各セクションは CLAUDE.md に1行の要約を残す
- すべての `domain`/`manual` ルールは `index.json` に存在する
- すべての `core` ルールはインラインのまま（ファイルのみへの抽出は行わない）
- Frontmatter が信頼の源; `index.json` は派生物
- パーサーは ATX 見出し（`##`、`###`）でのみ分割

## セキュリティ

このツールはローカルの markdown および JSON ファイルの読み書きのみを行います。ネットワークリクエスト、テレメトリの収集、外部サービスへのアクセスは一切行いません。

### 脅威モデル

| 脅威 | 緩和策 |
|------|--------|
| 不適切な分割によるデータ損失 | 対話型の承認 + `--dry-run` モード |
| 不正なルールファイル | `validate` コマンドがすべての構造的問題を検出 |
| 古いインデックス | `validate` が frontmatter と index.json の乖離を検出 |

完全なセキュリティポリシーについては [SECURITY.md](SECURITY.md) を参照してください。

---

[MCP Tool Shop](https://mcp-tool-shop.github.io/) 製
