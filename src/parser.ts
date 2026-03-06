/**
 * Markdown section parser.
 *
 * Contract:
 * - Splits on ATX headings (## and ###) only
 * - ### under a ## groups with its parent
 * - Standalone ### treated as its own section
 * - Unsupported structures (no headings, loose prose) are reported, not guessed
 * - Frontmatter is parsed from YAML-like --- blocks (hand-rolled, no deps)
 */

import type { Section, Frontmatter, Priority, Triggers } from "./types.js";
import { DEFAULT_TRIGGERS } from "./types.js";

// ── Token estimation ───────────────────────────────────────────
// Rough heuristic: 1 token ≈ 4 characters for English text.
// Good enough for budget dashboards; not meant for billing.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── ATX heading detection ──────────────────────────────────────
const HEADING_RE = /^(#{1,6})\s+(.+)$/;

interface HeadingMatch {
  level: number;
  text: string;
  lineIndex: number;
}

function detectHeadings(lines: string[]): HeadingMatch[] {
  const headings: HeadingMatch[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = HEADING_RE.exec(lines[i]);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        lineIndex: i,
      });
    }
  }
  return headings;
}

// ── Section extraction ─────────────────────────────────────────
// Splits a markdown document into sections based on ## headings.
// ### headings are grouped under their parent ##.
// Content before the first ## is its own section (preamble).
export function parseSections(content: string): Section[] {
  const lines = content.split("\n");
  const headings = detectHeadings(lines);

  // Filter to only ## and ### headings (our supported split anchors)
  const splitHeadings = headings.filter((h) => h.level === 2 || h.level === 3);

  if (splitHeadings.length === 0) {
    // No splittable headings — return the whole document as one section
    if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === "")) {
      return [];
    }
    return [
      {
        heading: "(preamble)",
        level: 0,
        startLine: 0,
        endLine: lines.length,
        content: content,
        lines: lines.length,
        tokens_est: estimateTokens(content),
      },
    ];
  }

  const sections: Section[] = [];

  // Content before first heading (preamble)
  if (splitHeadings[0].lineIndex > 0) {
    const preambleLines = lines.slice(0, splitHeadings[0].lineIndex);
    const preambleContent = preambleLines.join("\n");
    // Only include if it has actual content (not just blank lines)
    if (preambleContent.trim().length > 0) {
      sections.push({
        heading: "(preamble)",
        level: 0,
        startLine: 0,
        endLine: splitHeadings[0].lineIndex,
        content: preambleContent,
        lines: preambleLines.length,
        tokens_est: estimateTokens(preambleContent),
      });
    }
  }

  // Group headings: ## owns everything until the next ##
  // ### under a ## is part of that ## section
  for (let i = 0; i < splitHeadings.length; i++) {
    const h = splitHeadings[i];

    // If this is a ### and there's a preceding ## that owns it, skip
    // (it was already included in the parent ## section)
    if (h.level === 3) {
      // Check if there's a preceding ## that would own this ###
      let ownedByParent = false;
      for (let j = i - 1; j >= 0; j--) {
        if (splitHeadings[j].level === 2) {
          ownedByParent = true;
          break;
        }
        if (splitHeadings[j].level < 3) break;
      }
      if (ownedByParent) continue;
    }

    // Find the end of this section: next heading at same or higher level
    let endLine = lines.length;
    for (let j = i + 1; j < splitHeadings.length; j++) {
      if (splitHeadings[j].level <= h.level) {
        endLine = splitHeadings[j].lineIndex;
        break;
      }
    }

    // Trim trailing blank lines
    while (endLine > h.lineIndex + 1 && lines[endLine - 1].trim() === "") {
      endLine--;
    }

    const sectionLines = lines.slice(h.lineIndex, endLine);
    const sectionContent = sectionLines.join("\n");

    sections.push({
      heading: h.text,
      level: h.level,
      startLine: h.lineIndex,
      endLine: endLine,
      content: sectionContent,
      lines: sectionLines.length,
      tokens_est: estimateTokens(sectionContent),
    });
  }

  return sections;
}

// ── Frontmatter parser ─────────────────────────────────────────
// Parses YAML-like frontmatter from --- delimited blocks.
// Hand-rolled: supports strings, arrays (inline [...] and block - item),
// booleans, and nested objects (one level: triggers).
// No deps, deterministic, predictable.

export function parseFrontmatter(
  content: string,
): { frontmatter: Frontmatter | null; body: string } {
  const lines = content.split("\n");

  // Must start with ---
  if (lines[0]?.trim() !== "---") {
    return { frontmatter: null, body: content };
  }

  // Find closing ---
  let closeIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      closeIndex = i;
      break;
    }
  }

  if (closeIndex === -1) {
    return { frontmatter: null, body: content };
  }

  const fmLines = lines.slice(1, closeIndex);
  const body = lines.slice(closeIndex + 1).join("\n");

  // Parse key-value pairs
  const data: Record<string, unknown> = {};
  let currentKey = "";
  let currentArray: string[] | null = null;
  let currentObject: Record<string, boolean> | null = null;

  for (const line of fmLines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;

    // Block array item: - value
    if (currentArray !== null && trimmed.startsWith("- ")) {
      currentArray.push(trimmed.slice(2).trim());
      continue;
    }

    // Nested object value: key: value (indented)
    if (currentObject !== null && line.startsWith("  ")) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1) {
        const key = trimmed.slice(0, colonIdx).trim();
        const val = trimmed.slice(colonIdx + 1).trim();
        currentObject[key] = val === "true";
        continue;
      }
    }

    // Flush pending array/object
    if (currentArray !== null) {
      data[currentKey] = currentArray;
      currentArray = null;
    }
    if (currentObject !== null) {
      data[currentKey] = currentObject;
      currentObject = null;
    }

    // Key: value pair
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rawVal = trimmed.slice(colonIdx + 1).trim();
    currentKey = key;

    if (rawVal === "") {
      // Could be block array or nested object — peek at next lines
      // We'll handle on next iteration
      // Check if next non-empty line is indented with "- " (array) or "  key:" (object)
      const nextIdx = fmLines.indexOf(line) + 1;
      if (nextIdx < fmLines.length) {
        const nextTrimmed = fmLines[nextIdx].trim();
        if (nextTrimmed.startsWith("- ")) {
          currentArray = [];
        } else if (fmLines[nextIdx].startsWith("  ")) {
          currentObject = {};
        }
      }
      continue;
    }

    // Inline array: [a, b, c]
    if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
      const inner = rawVal.slice(1, -1);
      data[key] = inner
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      continue;
    }

    // Boolean
    if (rawVal === "true") {
      data[key] = true;
      continue;
    }
    if (rawVal === "false") {
      data[key] = false;
      continue;
    }

    // String (strip quotes if present)
    data[key] =
      rawVal.startsWith('"') && rawVal.endsWith('"')
        ? rawVal.slice(1, -1)
        : rawVal;
  }

  // Flush any trailing array/object
  if (currentArray !== null) data[currentKey] = currentArray;
  if (currentObject !== null) data[currentKey] = currentObject;

  // Validate required fields
  if (typeof data.id !== "string" || !data.id) {
    return { frontmatter: null, body: content };
  }

  const VALID_PRIORITIES = new Set(["core", "domain", "manual"]);

  const fm: Frontmatter = {
    id: data.id as string,
    keywords: Array.isArray(data.keywords)
      ? (data.keywords as string[])
      : [],
    patterns: Array.isArray(data.patterns)
      ? (data.patterns as string[])
      : [],
    priority: VALID_PRIORITIES.has(data.priority as string)
      ? (data.priority as Priority)
      : "domain",
    triggers: parseTriggers(data.triggers),
  };

  return { frontmatter: fm, body };
}

function parseTriggers(raw: unknown): Triggers {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TRIGGERS };
  const obj = raw as Record<string, boolean>;
  return {
    task: typeof obj.task === "boolean" ? obj.task : DEFAULT_TRIGGERS.task,
    plan: typeof obj.plan === "boolean" ? obj.plan : DEFAULT_TRIGGERS.plan,
    edit: typeof obj.edit === "boolean" ? obj.edit : DEFAULT_TRIGGERS.edit,
  };
}

// ── Frontmatter serializer ─────────────────────────────────────
export function serializeFrontmatter(fm: Frontmatter): string {
  const lines: string[] = ["---"];
  lines.push(`id: ${fm.id}`);
  lines.push(`keywords: [${fm.keywords.join(", ")}]`);
  if (fm.patterns.length > 0) {
    lines.push(`patterns: [${fm.patterns.join(", ")}]`);
  }
  lines.push(`priority: ${fm.priority}`);
  lines.push("triggers:");
  lines.push(`  task: ${fm.triggers.task}`);
  lines.push(`  plan: ${fm.triggers.plan}`);
  lines.push(`  edit: ${fm.triggers.edit}`);
  lines.push("---");
  return lines.join("\n");
}

// ── Heading to kebab-case ID ───────────────────────────────────
// Strips noise words and parenthetical context to produce clean, short IDs.
// "GitHub Actions Rules (Non-Negotiable)" → "github-actions"
// "Canonical Ownership (Source of Truth)" → "ownership"
// "Site Publishing Contract (Marketing Repo)" → "site-publishing"
const NOISE_WORDS = new Set([
  "rules", "rule", "non-negotiable", "nonnegotiable", "contract",
  "source", "of", "truth", "the", "a", "an", "and", "for", "in",
  "required", "before", "after", "hard",
]);

export function headingToId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")         // strip parenthetical context
    .replace(/[^a-z0-9\s-]/g, " ")     // remove punctuation
    .split(/\s+/)
    .filter((w) => w.length > 0 && !NOISE_WORDS.has(w))
    .slice(0, 3)                        // max 3 words in ID
    .join("-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "unnamed";
}
