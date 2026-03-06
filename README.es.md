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

Pon tu CLAUDE.md a dieta.

`claude-rules` es un generador de tablas de despacho y optimizador de archivos de instrucciones para [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Divide archivos de instrucciones inflados en un pequeno indice de enrutamiento (siempre cargado) y archivos de reglas por tema (cargados bajo demanda), ahorrando tokens de contexto en cada sesion.

## El Problema

Los archivos CLAUDE.md crecen con el tiempo. Cada linea cuesta tokens en cada sesion, sea relevante o no. Un archivo de instrucciones de 300 lineas se convierte silenciosamente en un impuesto sobre cada pensamiento del modelo.

## La Solucion

Tres capas, sin ambiguedad:

| Capa | Archivo | Carga |
|------|---------|-------|
| Consola del operador | `CLAUDE.md` | Siempre (indice ligero) |
| Tabla de despacho | `.claude/rules/index.json` | Siempre (legible por maquina) |
| Archivos de reglas | `.claude/rules/*.md` | Bajo demanda |

Cada archivo de reglas lleva sus propios metadatos de enrutamiento como frontmatter:

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

Cuando el agente ve una tarea que menciona "CI" o "workflow", lee el archivo de reglas correspondiente. El resto permanece sin cargar.

## Instalacion

```bash
npm install -g @mcptoolshop/claude-rules
# o
npx @mcptoolshop/claude-rules analyze
```

## Uso

### Analyze

Evalua las secciones de tu CLAUDE.md y descubre que se puede extraer:

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

Extraccion interactiva: apruebas cada seccion antes de extraerla:

```bash
claude-rules split              # interactivo
claude-rules split --dry-run    # vista previa sin escribir
```

Cada extraccion propuesta muestra una vista previa, nombre de archivo sugerido, palabras clave y prioridad. Apruebas o saltas cada una.

### Validate

Revisa la salud de tu directorio de reglas:

```bash
claude-rules validate
```

Verifica: referencias de archivos faltantes, archivos de reglas huerfanos, desviacion del frontmatter, palabras clave vacias en reglas de dominio, IDs duplicados.

### Stats

Observa la fisica de tu sistema:

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

## Niveles de Prioridad

| Nivel | Comportamiento | Ejemplo |
|-------|----------------|---------|
| `core` | Siempre en linea en CLAUDE.md | "test is right until proven otherwise" |
| `domain` | Se carga cuando coinciden las palabras clave de la tarea | Reglas de GitHub Actions al editar CI |
| `manual` | Nunca se carga automaticamente, consulta deliberada | Particularidades oscuras de plataforma |

## Como Funciona el Enrutamiento

El agente ve la tabla de despacho en CLAUDE.md y dos senales lo guian a cargar un archivo de reglas:

1. **Coincidencia semantica** — la tarea menciona "publishing" o "CI"
2. **Instruccion explicita** — CLAUDE.md dice "lee ese archivo de reglas antes de planificar o editar"

Este es un sistema de sugerencias para el bucle del agente, no magia. La combinacion de coincidencia por palabras clave e instruccion explicita lo hace confiable.

## Invariantes

- Cada seccion extraida deja un resumen de 1 linea en CLAUDE.md
- Cada regla `domain`/`manual` existe en `index.json`
- Cada regla `core` permanece en linea (nunca se extrae solo a archivo)
- El frontmatter es la fuente de verdad; `index.json` es derivado
- El parser solo divide en encabezados ATX (`##`, `###`)

## Seguridad

Esta herramienta solo lee y escribe archivos markdown y JSON locales. No realiza solicitudes de red, no recopila telemetria ni accede a servicios externos.

### Modelo de Amenazas

| Amenaza | Mitigacion |
|---------|------------|
| Perdida de datos por mala division | Aprobacion interactiva + modo `--dry-run` |
| Archivos de reglas malformados | El comando `validate` detecta todos los problemas estructurales |
| Indice desactualizado | `validate` detecta desviaciones entre el frontmatter y index.json |

Consulta [SECURITY.md](SECURITY.md) para la politica de seguridad completa.

---

Creado por [MCP Tool Shop](https://mcp-tool-shop.github.io/)
