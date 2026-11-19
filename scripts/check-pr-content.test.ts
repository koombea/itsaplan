import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = join(import.meta.dir, 'check-pr-content.ts');
// Spelled in pieces so this file does not trip the gate it tests.
const TRAILER = `Co-${'authored'}-by: ${'Cla' + 'ude'} <bot@example.test>`;

let repo: string;

function git(...args: string[]): string {
  const result = Bun.spawnSync(
    ['git', '-c', 'user.name=Test', '-c', 'user.email=test@example.test', ...args],
    { cwd: repo },
  );
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function commit(file: string, message: string): string {
  writeFileSync(join(repo, file), `${file}\n`);
  git('add', file);
  git('commit', '-q', '-m', message);
  return git('rev-parse', 'HEAD');
}

function gate(...args: string[]): number {
  return Bun.spawnSync(['bun', SCRIPT, ...args], {
    cwd: repo,
    env: { ...process.env, PR_TITLE: 'chore: test', PR_BODY: '' },
  }).exitCode;
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'pr-content-'));
  git('init', '-q', '-b', 'main');
});

afterEach(() => rmSync(repo, { recursive: true, force: true }));

test('rejects attribution in a commit of the pull request', () => {
  const base = commit('base.txt', 'chore: base');
  const head = commit('change.txt', `feat: change\n\n${TRAILER}`);
  expect(gate(base, head)).toBe(1);
});

// Merges an attributed commit made on a side branch, and returns that branch's tip.
function mergeAttributedBranch(branch: string): string {
  git('checkout', '-q', '-b', branch);
  const tip = commit(`${branch}.txt`, `fix: ${branch} change\n\n${TRAILER}`);
  git('checkout', '-q', 'main');
  git('merge', '-q', '--no-ff', '-m', `chore: merge ${branch}`, branch);
  return tip;
}

// A sync merges upstream's history, whose commits are not the pull request's to rewrite.
test('passes attributed commits that are already in upstream', () => {
  const base = commit('base.txt', 'chore: base');
  const upstream = mergeAttributedBranch('upstream');
  expect(gate(base, git('rev-parse', 'HEAD'), upstream)).toBe(0);
});

// Adds `scripts/check-pr-content.ts` with the given pattern lines and returns the base and head.
function changeGatePatterns(...lines: string[]): [string, string] {
  const base = commit('base.txt', 'chore: base');
  mkdirSync(join(repo, 'scripts'), { recursive: true });
  const file = ['const AI_ATTRIBUTION_PATTERNS: RegExp[] = [', ...lines, '];', ''].join('\n');
  writeFileSync(join(repo, 'scripts/check-pr-content.ts'), file);
  git('add', '.');
  git('commit', '-q', '-m', 'ci: change the gate patterns');
  return [base, git('rev-parse', 'HEAD')];
}

const MARKER = `co-${'authored'}-by:[^\\n]*\\b${'cla' + 'ude'}\\b`;

test('passes the gate spelling a marker out in one of its own pattern literals', () => {
  expect(gate(...changeGatePatterns(`  /${MARKER}/i,`))).toBe(0);
});

test('rejects attribution in a comment among the gate patterns', () => {
  expect(gate(...changeGatePatterns('  /x/,', `  // ${TRAILER}`))).toBe(1);
});

test('rejects a regex literal followed by a comment carrying attribution', () => {
  expect(gate(...changeGatePatterns(`  /x/, // ${TRAILER} /i,`))).toBe(1);
});

test('rejects an attributed commit merged in from a branch that is not upstream', () => {
  const base = commit('base.txt', 'chore: base');
  git('checkout', '-q', '-b', 'upstream');
  const upstream = commit('upstream.txt', 'fix: upstream change');
  git('checkout', '-q', 'main');
  mergeAttributedBranch('side');
  expect(gate(base, git('rev-parse', 'HEAD'), upstream)).toBe(1);
});
