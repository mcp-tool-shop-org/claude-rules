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

Coloque seu CLAUDE.md de dieta.

`claude-rules` e um gerador de tabela de despacho e otimizador de arquivos de instrucoes para o [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Ele divide arquivos de instrucoes inchados em um pequeno indice de roteamento (sempre carregado) e arquivos de regras por tema (carregados sob demanda), economizando tokens de contexto a cada sessao.

## O Problema

Arquivos CLAUDE.md crescem com o tempo. Cada linha custa tokens a cada sessao — sendo relevante ou nao. Um arquivo de instrucoes de 300 linhas silenciosamente se torna um imposto sobre cada pensamento do modelo.

## A Solucao

Tres camadas, sem ambiguidade:

| Camada | Arquivo | Carregamento |
|--------|---------|--------------|
| Console do operador | `CLAUDE.md` | Sempre (indice leve) |
| Tabela de despacho | `.claude/rules/index.json` | Sempre (legivel por maquina) |
| Arquivos de regras | `.claude/rules/*.md` | Sob demanda |

Cada arquivo de regras carrega seus proprios metadados de roteamento como frontmatter:

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

Quando o agente ve uma tarefa que menciona "CI" ou "workflow", ele le o arquivo de regras correspondente. O resto permanece sem carregar.

## Instalacao

```bash
npm install -g @mcptoolshop/claude-rules
# ou
npx @mcptoolshop/claude-rules analyze
```

## Uso

### Analyze

Avalie as secoes do seu CLAUDE.md e veja o que pode ser extraido:

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

Extracao interativa — voce aprova cada secao antes de ser extraida:

```bash
claude-rules split              # interativo
claude-rules split --dry-run    # pre-visualizacao sem escrever
```

Cada extracao proposta mostra uma pre-visualizacao, nome de arquivo sugerido, palavras-chave e prioridade. Voce aprova ou pula cada uma.

### Validate

Verifique a saude do seu diretorio de regras:

```bash
claude-rules validate
```

Verifica: referencias de arquivos ausentes, arquivos de regras orfaos, desvio do frontmatter, palavras-chave vazias em regras de dominio, IDs duplicados.

### Stats

Veja a fisica do seu sistema:

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

## Niveis de Prioridade

| Nivel | Comportamento | Exemplo |
|-------|---------------|---------|
| `core` | Sempre inline no CLAUDE.md | "test is right until proven otherwise" |
| `domain` | Carregado quando as palavras-chave da tarefa correspondem | Regras do GitHub Actions ao editar CI |
| `manual` | Nunca carregado automaticamente, consulta deliberada | Peculiaridades obscuras de plataforma |

## Como o Roteamento Funciona

O agente ve a tabela de despacho no CLAUDE.md e dois sinais o direcionam a carregar um arquivo de regras:

1. **Correspondencia semantica** — a tarefa menciona "publishing" ou "CI"
2. **Instrucao explicita** — CLAUDE.md diz "leia esse arquivo de regras antes de planejar ou editar"

Este e um sistema de dicas para o loop do agente, nao magica. A combinacao de correspondencia por palavras-chave e instrucao explicita o torna confiavel.

## Invariantes

- Cada secao extraida deixa um resumo de 1 linha no CLAUDE.md
- Cada regra `domain`/`manual` existe no `index.json`
- Cada regra `core` permanece inline (nunca extraida apenas para arquivo)
- O frontmatter e a fonte da verdade; `index.json` e derivado
- O parser so divide em cabecalhos ATX (`##`, `###`)

## Seguranca

Esta ferramenta apenas le e escreve arquivos markdown e JSON locais. Nao faz requisicoes de rede, nao coleta telemetria e nao acessa servicos externos.

### Modelo de Ameacas

| Ameaca | Mitigacao |
|--------|-----------|
| Perda de dados por divisao ruim | Aprovacao interativa + modo `--dry-run` |
| Arquivos de regras malformados | O comando `validate` detecta todos os problemas estruturais |
| Indice desatualizado | `validate` detecta desvios entre o frontmatter e index.json |

Consulte [SECURITY.md](SECURITY.md) para a politica de seguranca completa.

---

Criado por [MCP Tool Shop](https://mcp-tool-shop.github.io/)
