/**
 * Token budget dashboard.
 *
 * Shows the physics of the system: what's always loaded, what's on-demand,
 * and how much context you're saving per session.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { estimateTokens, parseFrontmatter } from "./parser.js";
import { resolveClaudeMd } from "./analyze.js";
import { log, info, ok, warn, fail, BOLD, DIM, RESET, CYAN, GREEN, YELLOW } from "./cli.js";
import { positionalArgs, flagValue } from "./cli.js";
import type { RuleIndex, RuleEntry } from "./types.js";

// ── CLI command: stats ─────────────────────────────────────────
export async function cmdStats(args: string[]): Promise<void> {
  const rulesDir = flagValue(args, "--rules-dir") ?? ".claude/rules";
  const repoRoot = process.cwd();
  const absRulesDir = resolve(repoRoot, rulesDir);
  const indexPath = join(absRulesDir, "index.json");

  // Check if split has been done
  if (!existsSync(indexPath)) {
    // No split yet — analyze the monolithic file
    const filePath = resolveClaudeMd(positionalArgs(args, ["--rules-dir"]));
    if (!existsSync(filePath)) {
      fail(
        "IO_FILE_NOT_FOUND",
        "No CLAUDE.md or index.json found",
        "Run 'claude-rules analyze' first to see what can be optimized",
      );
    }

    const content = readFileSync(filePath, "utf8");
    const lines = content.split("\n").length;
    const tokens = estimateTokens(content);

    log("");
    log(`${BOLD}claude-rules stats${RESET}  ${DIM}(monolithic — not yet split)${RESET}`);
    log("");
    log(`  ${BOLD}CLAUDE.md${RESET} (always loaded)`);
    log(`    Lines: ${lines}    Tokens (est): ${tokens}`);
    log("");
    log(`  ${DIM}No rule files found. Run 'claude-rules split' to optimize.${RESET}`);
    log("");
    log(`  ${BOLD}Budget${RESET}`);
    log(`    Always loaded:         ${tokens} tokens`);
    log(`    On-demand total:       0 tokens`);
    log(`    ${YELLOW}Savings vs current:    0%${RESET}`);
    log("");
    return;
  }

  // Parse index
  let index: RuleIndex;
  try {
    index = JSON.parse(readFileSync(indexPath, "utf8")) as RuleIndex;
  } catch {
    fail(
      "INVALID_INDEX",
      "Failed to parse index.json",
      "Run 'claude-rules validate' to diagnose",
    );
  }

  // Read actual CLAUDE.md for current always-loaded cost
  const claudeMdPath = resolveClaudeMd(positionalArgs(args, ["--rules-dir"]));
  let claudeMdTokens = 0;
  let claudeMdLines = 0;
  if (existsSync(claudeMdPath)) {
    const content = readFileSync(claudeMdPath, "utf8");
    claudeMdTokens = estimateTokens(content);
    claudeMdLines = content.split("\n").length;
  }

  log("");
  log(`${BOLD}claude-rules stats${RESET}`);
  log("");

  // CLAUDE.md section
  log(`  ${BOLD}CLAUDE.md${RESET} (always loaded)`);
  log(`    Lines: ${claudeMdLines}    Tokens (est): ${claudeMdTokens}`);
  log("");

  // Rule files section
  if (index.rules.length > 0) {
    log(`  ${BOLD}Rule files${RESET} (on-demand)`);

    // Recalculate actual tokens from file contents
    let totalOnDemandTokens = 0;
    let totalOnDemandLines = 0;

    for (const rule of index.rules) {
      const absPath = resolve(repoRoot, rule.path);
      let actualTokens = rule.tokens_est;
      let actualLines = rule.lines;

      if (existsSync(absPath)) {
        const content = readFileSync(absPath, "utf8");
        actualTokens = estimateTokens(content);
        actualLines = content.split("\n").length;
      }

      totalOnDemandTokens += actualTokens;
      totalOnDemandLines += actualLines;

      const priorityColor =
        rule.priority === "domain"
          ? CYAN
          : rule.priority === "manual"
            ? DIM
            : GREEN;

      log(
        `    ${rule.id.padEnd(24)} ${String(actualLines).padStart(4)} lines  ${String(actualTokens).padStart(5)} tokens  ${priorityColor}${rule.priority}${RESET}`,
      );
    }

    log(`    ${"─".repeat(58)}`);
    log(
      `    ${"Total on-demand".padEnd(24)} ${String(totalOnDemandLines).padStart(4)} lines  ${String(totalOnDemandTokens).padStart(5)} tokens`,
    );
    log("");

    // Budget section
    const totalTokens = claudeMdTokens + totalOnDemandTokens;
    const avgTaskLoad =
      index.rules.length > 0
        ? Math.round(totalOnDemandTokens / index.rules.length)
        : 0;

    // Calculate savings vs monolithic (always-loaded + on-demand = what it used to be)
    const savingsPct =
      totalTokens > 0
        ? Math.round(
            ((totalOnDemandTokens) / totalTokens) * 100,
          )
        : 0;

    log(`  ${BOLD}Budget${RESET}`);
    log(`    Always loaded:         ${claudeMdTokens} tokens`);
    log(`    On-demand total:       ${totalOnDemandTokens} tokens`);
    log(`    Avg task load (est):   ${avgTaskLoad} tokens`);
    if (index.budget.avg_task_load_observed !== null) {
      log(`    Avg task load (obs):   ${index.budget.avg_task_load_observed} tokens`);
    }
    log(`    ${GREEN}Savings vs monolithic:   ${savingsPct}%${RESET}`);
  }

  log("");
}
