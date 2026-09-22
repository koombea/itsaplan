#!/usr/bin/env bun
/**
 * PR content gate: rejects AI attribution markers left in a pull request —
 * "Co-Authored-By" lines naming an AI assistant, assistant tool URLs, and
 * "Generated with ..." phrasing. It scans the PR title, the PR body, every
 * commit message in the range, and every line added by the diff.
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

// This file spells the markers out, so scanning it would always report itself.
const SELF = 'scripts/check-pr-content.ts';

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

// Separate commit records with a control character that never appears in a commit
// message, and hash/message within a record the same way.
const RECORD_SEP = '\x1e';
const FIELD_SEP = '\x1f';
const log = git('log', `${baseArg}..${headArg}`, `--format=%H${FIELD_SEP}%B${RECORD_SEP}`);
for (const record of log.split(RECORD_SEP)) {
  if (!record.trim()) continue;
  const sepIndex = record.indexOf(FIELD_SEP);
  if (sepIndex === -1) continue;
  const hash = record.slice(0, sepIndex);
  const message = record.slice(sepIndex + FIELD_SEP.length);
  scanBlock(`commit ${hash.slice(0, 7)}`, message);
}

const diff = git('diff', '--unified=0', `${baseArg}...${headArg}`);
let currentPath: string | undefined;
let newLineNo = 0;
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ ')) {
    const path = line.slice(4).trim();
    currentPath = path === '/dev/null' || !path.startsWith('b/') ? undefined : path.slice(2);
    continue;
  }
  if (line.startsWith('--- ')) {
    continue;
  }
  const hunkMatch = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
  if (hunkMatch) {
    newLineNo = Number(hunkMatch[1]);
    continue;
  }
  if (line.startsWith('+')) {
    const content = line.slice(1);
    if (currentPath && currentPath !== SELF && hasAIAttribution(content)) {
      violations.push({ path: currentPath, line: newLineNo, text: content.trim() });
    }
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
