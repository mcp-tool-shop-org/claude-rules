// ── Priority tiers ──────────────────────────────────────────────
// core:   always inline in CLAUDE.md — violating these wrecks the repo
// domain: keyword-triggered — agent loads when task matches
// manual: never auto-loaded — deliberate lookup only
export type Priority = "core" | "domain" | "manual";

// ── Trigger phases ─────────────────────────────────────────────
// Controls WHEN a rule should be loaded relative to the agent loop.
// v1 stores metadata only; v1.1 can act on it.
export interface Triggers {
  task: boolean;   // load during task interpretation
  plan: boolean;   // load during plan formation
  edit: boolean;   // load before file edits
}

// ── Rule entry in the dispatch table ───────────────────────────
export interface RuleEntry {
  id: string;            // kebab-case, unique, stable once created
  path: string;          // relative to repo root
  keywords: string[];    // lowercase surface words for matching
  patterns: string[];    // named intents (e.g. "ci_pipeline"), not regex
  priority: Priority;
  summary: string;       // <120 chars, dense routing signal
  triggers: Triggers;
  tokens_est: number;    // estimated tokens (chars / 4)
  lines: number;         // line count of the rule file
}

// ── Budget model ───────────────────────────────────────────────
export interface Budget {
  always_loaded_est: number;       // tokens in CLAUDE.md itself
  on_demand_total_est: number;     // sum of all rule file tokens
  avg_task_load_est: number;       // estimated average per session
  avg_task_load_observed: number | null;  // from usage telemetry (v1.1)
}

// ── The dispatch table (.claude/rules/index.json) ──────────────
export interface RuleIndex {
  version: string;
  generated: string;    // ISO 8601
  rules: RuleEntry[];
  budget: Budget;
}

// ── Frontmatter parsed from a rule file ────────────────────────
export interface Frontmatter {
  id: string;
  keywords: string[];
  patterns: string[];
  priority: Priority;
  triggers: Triggers;
}

// ── A section detected by the parser ───────────────────────────
export interface Section {
  heading: string;       // the heading text (without # prefix)
  level: number;         // heading depth (2 for ##, 3 for ###)
  startLine: number;     // 0-indexed line where heading appears
  endLine: number;       // 0-indexed line where section ends (exclusive)
  content: string;       // full text including heading
  lines: number;         // line count
  tokens_est: number;    // estimated tokens
}

// ── A split proposal shown to the user ─────────────────────────
export interface SplitProposal {
  section: Section;
  suggestedId: string;       // kebab-case derived from heading
  suggestedPath: string;     // e.g. ".claude/rules/github-actions.md"
  suggestedKeywords: string[];
  suggestedPatterns: string[];
  suggestedPriority: Priority;
  suggestedSummary: string;
  reason: string;            // why this section should be extracted
}

// ── Analysis report ────────────────────────────────────────────
export interface AnalysisReport {
  filePath: string;
  totalLines: number;
  totalTokens: number;
  sections: Section[];
  proposals: SplitProposal[];
  unsplittable: Section[];      // sections that can't be cleanly split
  coreCandidate: Section[];     // sections that should stay inline
}

// ── Validation issue ───────────────────────────────────────────
export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: IssueSeverity;
  code: string;           // e.g. "ORPHAN_FILE", "MISSING_REF", "DRIFT"
  message: string;
  file?: string;
  line?: number;
}

// ── Default triggers ───────────────────────────────────────────
export const DEFAULT_TRIGGERS: Triggers = {
  task: true,
  plan: true,
  edit: false,
};
