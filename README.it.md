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

Metti il tuo CLAUDE.md a dieta.

`claude-rules` e un generatore di tabelle di dispatch e ottimizzatore di file di istruzioni per [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Divide i file di istruzioni sovraccarichi in un piccolo indice di routing (sempre caricato) e file di regole tematiche (caricati su richiesta), risparmiando token di contesto a ogni sessione.

## Il Problema

I file CLAUDE.md crescono nel tempo. Ogni riga costa token a ogni sessione, che sia rilevante o meno. Un file di istruzioni di 300 righe diventa silenziosamente una tassa su ogni pensiero del modello.

## La Soluzione

Tre livelli, nessuna ambiguita:

| Livello | File | Caricamento |
|---------|------|-------------|
| Console operatore | `CLAUDE.md` | Sempre (indice leggero) |
| Tabella di dispatch | `.claude/rules/index.json` | Sempre (leggibile dalla macchina) |
| File di regole | `.claude/rules/*.md` | Su richiesta |

Ogni file di regole contiene i propri metadati di routing come frontmatter:

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

Quando l'agente vede un compito che menziona "CI" o "workflow", legge il file di regole corrispondente. Il resto rimane non caricato.

## Installazione

```bash
npm install -g @mcptoolshop/claude-rules
# oppure
npx @mcptoolshop/claude-rules analyze
```

## Utilizzo

### Analyze

Valuta le sezioni del tuo CLAUDE.md e scopri cosa puo essere estratto:

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

Estrazione interattiva — approvi ogni sezione prima che venga estratta:

```bash
claude-rules split              # interattivo
claude-rules split --dry-run    # anteprima senza scrivere
```

Ogni estrazione proposta mostra un'anteprima, un nome file suggerito, parole chiave e priorita. Approvi o salti ognuna.

### Validate

Controlla la salute della tua directory di regole:

```bash
claude-rules validate
```

Verifica: riferimenti a file mancanti, file di regole orfani, deriva del frontmatter, parole chiave vuote sulle regole di dominio, ID duplicati.

### Stats

Osserva la fisica del tuo sistema:

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

## Livelli di Priorita

| Livello | Comportamento | Esempio |
|---------|---------------|---------|
| `core` | Sempre inline in CLAUDE.md | "test is right until proven otherwise" |
| `domain` | Caricato quando le parole chiave del compito corrispondono | Regole GitHub Actions quando si modifica il CI |
| `manual` | Mai caricato automaticamente, consultazione deliberata | Particolarita oscure della piattaforma |

## Come Funziona il Routing

L'agente vede la tabella di dispatch in CLAUDE.md e due segnali lo guidano a caricare un file di regole:

1. **Corrispondenza semantica** — il compito menziona "publishing" o "CI"
2. **Istruzione esplicita** — CLAUDE.md dice "leggi quel file di regole prima di pianificare o modificare"

Questo e un sistema di suggerimenti per il ciclo dell'agente, non magia. La combinazione di corrispondenza per parole chiave e istruzione esplicita lo rende affidabile.

## Invarianti

- Ogni sezione estratta lascia un riepilogo di 1 riga in CLAUDE.md
- Ogni regola `domain`/`manual` esiste in `index.json`
- Ogni regola `core` rimane inline (mai estratta solo in un file)
- Il frontmatter e la fonte di verita; `index.json` e derivato
- Il parser divide solo sui titoli ATX (`##`, `###`)

## Sicurezza

Questo strumento legge e scrive solo file markdown e JSON locali. Non effettua richieste di rete, non raccoglie telemetria e non accede a servizi esterni.

### Modello delle Minacce

| Minaccia | Mitigazione |
|----------|-------------|
| Perdita di dati da divisione errata | Approvazione interattiva + modalita `--dry-run` |
| File di regole malformati | Il comando `validate` rileva tutti i problemi strutturali |
| Indice obsoleto | `validate` rileva le derive tra il frontmatter e index.json |

Consulta [SECURITY.md](SECURITY.md) per la politica di sicurezza completa.

---

Creato da [MCP Tool Shop](https://mcp-tool-shop.github.io/)
