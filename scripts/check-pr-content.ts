#!/usr/bin/env bun
/**
 * PR content gate: rejects a Co-Authored-By trailer naming Claude, Anthropic,
 * Copilot, Cursor, ChatGPT, GPT-4/3.5, OpenAI, Codex or Gemini; a claude.ai/code
 * or claude.com/claude-code URL; "Generated with Claude Code" phrasing (English
 * or Spanish); and a generic "generated"/"co-authored" word near Claude, Copilot,
 * Cursor or ChatGPT. Scans the PR title, the PR body, every commit message in
 * the range, and every line added by the diff.
 */

type Violation = {
  path: string;
  line: number;
  text: string;
};

const [, , baseArg, headArg] = process.argv;
if (!baseArg || !headArg) {
  console.error('Usage: bun run scripts/check-pr-content.ts <baseSha> <headSha>');
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
  // "Generated with Claude Code" / "Generado con Código Claude", with or without the robot emoji.
  /(?:🤖\s*)?(generated with|generado con)\s+(claude code|c[oó]digo claude)/i,
  // Generic catch: an AI-generation or co-authorship word near an assistant name.
  /(generated|generado|co-authored)[\s\S]{0,40}(claude|copilot|cursor|chatgpt|gpt-4)/i,
];

function hasAIAttribution(line: string): boolean {
  return AI_ATTRIBUTION_PATTERNS.some((pattern) => pattern.test(line));
}

// This file spells the markers out inside AI_ATTRIBUTION_PATTERNS, so only the
// lines of that array literal are exempt from its own scan — every other added
// line in this file, including one impersonating an exemption, is still scanned.
const SELF = 'scripts/check-pr-content.ts';

function selfPatternRange(): { start: number; end: number } | undefined {
  const content = git('show', `${headArg}:${SELF}`);
  const lines = content.split('\n');
  const start = lines.findIndex((line) => line.includes('AI_ATTRIBUTION_PATTERNS'));
  if (start === -1) return undefined;
  const end = lines.findIndex((line, index) => index > start && line.trim() === '];');
  return end === -1 ? undefined : { start: start + 1, end: end + 1 };
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

const hashes = git('log', '--format=%H', `${baseArg}..${headArg}`).split('\n').filter(Boolean);
for (const hash of hashes) {
  const message = git('log', '-1', '--format=%B', hash);
  scanBlock(`commit ${hash.slice(0, 7)}`, message);
}

const selfRange = selfPatternRange();
const diff = git('diff', '--unified=0', `${baseArg}...${headArg}`);
let currentPath: string | undefined;
let newLineNo = 0;
let inHunk = false;
for (const line of diff.split('\n')) {
  if (line.startsWith('diff --git ')) {
    inHunk = false;
    continue;
  }
  if (!inHunk && line.startsWith('+++ ')) {
    const path = line.slice(4).trim();
    currentPath = path === '/dev/null' || !path.startsWith('b/') ? undefined : path.slice(2);
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
    const exempt =
      currentPath === SELF &&
      selfRange !== undefined &&
      newLineNo >= selfRange.start &&
      newLineNo <= selfRange.end;
    if (currentPath && !exempt && hasAIAttribution(content)) {
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
