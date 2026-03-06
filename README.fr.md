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

Mettez votre CLAUDE.md au regime.

`claude-rules` est un generateur de table de dispatch et un optimiseur de fichiers d'instructions pour [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Il divise les fichiers d'instructions volumineux en un petit index de routage (toujours charge) et des fichiers de regles thematiques (charges a la demande), economisant des tokens de contexte a chaque session.

## Le Probleme

Les fichiers CLAUDE.md grossissent avec le temps. Chaque ligne coute des tokens a chaque session, qu'elle soit pertinente ou non. Un fichier d'instructions de 300 lignes devient silencieusement une taxe sur chaque reflexion du modele.

## La Solution

Trois couches, sans ambiguite :

| Couche | Fichier | Chargement |
|--------|---------|------------|
| Console operateur | `CLAUDE.md` | Toujours (index leger) |
| Table de dispatch | `.claude/rules/index.json` | Toujours (lisible par machine) |
| Fichiers de regles | `.claude/rules/*.md` | A la demande |

Chaque fichier de regles porte ses propres metadonnees de routage en frontmatter :

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

Quand l'agent voit une tache qui mentionne "CI" ou "workflow", il lit le fichier de regles correspondant. Les autres restent non charges.

## Installation

```bash
npm install -g @mcptoolshop/claude-rules
# ou
npx @mcptoolshop/claude-rules analyze
```

## Utilisation

### Analyze

Evaluez les sections de votre CLAUDE.md et decouvrez ce qui peut etre extrait :

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

Extraction interactive — vous approuvez chaque section avant son extraction :

```bash
claude-rules split              # interactif
claude-rules split --dry-run    # apercu sans ecriture
```

Chaque extraction proposee montre un apercu, un nom de fichier suggere, des mots-cles et une priorite. Vous approuvez ou passez chacune.

### Validate

Verifiez la sante de votre repertoire de regles :

```bash
claude-rules validate
```

Verifie : references de fichiers manquantes, fichiers de regles orphelins, derive du frontmatter, mots-cles vides sur les regles de domaine, IDs dupliques.

### Stats

Observez la physique de votre systeme :

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

## Niveaux de Priorite

| Niveau | Comportement | Exemple |
|--------|--------------|---------|
| `core` | Toujours en ligne dans CLAUDE.md | "test is right until proven otherwise" |
| `domain` | Charge quand les mots-cles de la tache correspondent | Regles GitHub Actions lors de l'edition du CI |
| `manual` | Jamais charge automatiquement, consultation deliberee | Particularites obscures de plateforme |

## Fonctionnement du Routage

L'agent voit la table de dispatch dans CLAUDE.md et deux signaux le guident pour charger un fichier de regles :

1. **Correspondance semantique** — la tache mentionne "publishing" ou "CI"
2. **Instruction explicite** — CLAUDE.md dit "lis ce fichier de regles avant de planifier ou d'editer"

C'est un systeme d'indices pour la boucle de l'agent, pas de la magie. La combinaison de la correspondance par mots-cles et de l'instruction explicite le rend fiable.

## Invariants

- Chaque section extraite laisse un resume d'une ligne dans CLAUDE.md
- Chaque regle `domain`/`manual` existe dans `index.json`
- Chaque regle `core` reste en ligne (jamais extraite uniquement dans un fichier)
- Le frontmatter est la source de verite ; `index.json` est derive
- Le parser ne decoupe que sur les titres ATX (`##`, `###`)

## Securite

Cet outil lit et ecrit uniquement des fichiers markdown et JSON locaux. Il n'effectue aucune requete reseau, ne collecte pas de telemetrie et n'accede a aucun service externe.

### Modele de Menaces

| Menace | Attenuation |
|--------|-------------|
| Perte de donnees due a une mauvaise division | Approbation interactive + mode `--dry-run` |
| Fichiers de regles malformes | La commande `validate` detecte tous les problemes structurels |
| Index desactualise | `validate` detecte les derives entre le frontmatter et index.json |

Consultez [SECURITY.md](SECURITY.md) pour la politique de securite complete.

---

Cree par [MCP Tool Shop](https://mcp-tool-shop.github.io/)
