#!/usr/bin/env bun
/**
 * PR content gate: rejects AI assistant attribution, matched by
 * AI_ATTRIBUTION_PATTERNS below. Scans the PR title, the PR body, every commit
 * message in the range that is not already in upstream, and every line added by
 * the diff.
 */

type Violation = {
  path: string;
  line: number;
  text: string;
};

const [, , baseArg, headArg, upstreamArg] = process.argv;
if (!baseArg || !headArg) {
  console.error('Usage: bun run scripts/check-pr-content.ts <baseSha> <headSha> [upstreamRef]');
  process.exit(1);
}

function git(...args: string[]): string {
  const result = Bun.spawnSync(['git', ...args]);
  if (result.exitCode !== 0) {
    console.error(`git ${args.join(' ')} failed:\n${new TextDecoder().decode(result.stderr)}`);
    process.exit(1);
  }
  return new TextDecoder().decode(result.stdout);
}

const AI_ATTRIBUTION_PATTERNS: RegExp[] = [
  // Co-Authored-By naming an AI assistant.
  /co-authored-by:[^\n]*\b(claude|anthropic|copilot|cursor|chatgpt|gpt-4|gpt-3(?:\.5)?|openai|codex|gemini)\b/i,
  // Assistant tool URLs.
  /claude\.(?:ai\/code|com\/claude-code)/i,
  // The tool's generation footer, in English or Spanish, with or without the robot emoji.
  /(?:\uD83E\uDD16\s*)?(generated with|generado con)\s+(claude code|c[o\u00F3]digo claude)/i,
  // Generic catch: an AI-generation or co-authorship word near an assistant name.
  /(generated|generado|co-authored)[\s\S]{0,40}(claude|copilot|cursor|chatgpt|gpt-4)/i,
];

function hasAIAttribution(line: string): boolean {
  return AI_ATTRIBUTION_PATTERNS.some((pattern) => pattern.test(line));
}

// This file spells the markers out in its pattern literals, so an added line of it that
// is exactly one of the patterns of the gate that runs (the base branch's copy) is not
// scanned. Any other line in it is.
const SELF = 'scripts/check-pr-content.ts';
const REGEX_LITERAL_LINE = /^\s*\/((?:\\.|[^\\/])+)\/([dgimsuyv]*),?\s*$/;

// Compared compiled. Bun rewrites non-ASCII characters of a regex literal as \u escapes,
// so the patterns spell those characters as escapes to keep source and runtime equal.
function isTrustedPatternLine(content: string): boolean {
  const literal = REGEX_LITERAL_LINE.exec(content);
  if (!literal) return false;
  let added: RegExp;
  try {
    added = new RegExp(literal[1]!, literal[2]);
  } catch {
    return false;
  }
  return AI_ATTRIBUTION_PATTERNS.some(
    (pattern) => pattern.source === added.source && pattern.flags === added.flags,
  );
}

const violations: Violation[] = [];

function scanBlock(source: string, text: string): void {
  text.split('\n').forEach((line, index) => {
    if (hasAIAttribution(line)) {
      violations.push({ path: source, line: index + 1, text: line.trim() });
    }
  });
}

if (process.env.PR_TITLE) {
  scanBlock('PR title', process.env.PR_TITLE);
}

if (process.env.PR_BODY) {
  scanBlock('PR body', process.env.PR_BODY);
}

// Commits already in upstream arrive through a sync and belong to its authors.
const upstreamExclude = upstreamArg ? ['--not', upstreamArg] : [];
const hashes = git('log', '--format=%H', `${baseArg}..${headArg}`, ...upstreamExclude)
  .split('\n')
  .filter(Boolean);
for (const hash of hashes) {
  const message = git('log', '-1', '--format=%B', hash);
  scanBlock(`commit ${hash.slice(0, 7)}`, message);
}

const diff = git('diff', '--unified=0', `${baseArg}...${headArg}`);
let currentPath = '';
let newLineNo = 0;
let inHunk = false;
for (const line of diff.split('\n')) {
  if (line.startsWith('diff --git ')) {
    inHunk = false;
    continue;
  }
  if (!inHunk && line.startsWith('+++ ')) {
    // Git quotes a path with special characters ("b/a\tb"); that path is still scanned.
    const path = line.slice(4).trim();
    currentPath = path.startsWith('b/') ? path.slice(2) : path;
    continue;
  }
  if (!inHunk && line.startsWith('--- ')) {
    continue;
  }
  const hunkMatch = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
  if (hunkMatch) {
    inHunk = true;
    newLineNo = Number(hunkMatch[1]);
    continue;
  }
  if (inHunk && line.startsWith('+')) {
    const content = line.slice(1);
    const exempt = currentPath === SELF && isTrustedPatternLine(content);
    if (!exempt && hasAIAttribution(content)) {
      violations.push({ path: currentPath, line: newLineNo, text: content.trim() });
    }
    newLineNo++;
    continue;
  }
  if (inHunk && line.startsWith(' ')) {
    newLineNo++;
    continue;
  }
}

if (violations.length === 0) {
  console.log('PR content gate: no AI attribution markers found.');
  process.exit(0);
}

console.log('PR content gate found AI attribution markers:\n');
for (const violation of violations) {
  console.log(`${violation.path}:${violation.line}`);
  console.log(`  ${violation.text}`);
}
process.exit(1);
