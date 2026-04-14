import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const scriptPath = path.join(repoRoot, 'validate-runtime-governance.mjs');

function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function createRuntimeFixture() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-governance-'));
  for (const relPath of [
    '.opencode/bin/ast-index.exe',
    'agents',
    'context',
    'skills',
    'opencode.json',
    'instructions.md',
    'PROJECT_GUIDE.md',
    'validate-runtime-governance.mjs'
  ]) {
    copyRecursive(path.join(repoRoot, relPath), path.join(fixtureRoot, relPath));
  }

  return fixtureRoot;
}

function createInstalledRuntimeFixture() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-installed-'));
  const installRoot = path.join(projectRoot, '.opencode');

  for (const relPath of [
    'agents',
    'context',
    'skills',
    'opencode.json',
    'instructions.md',
    'PROJECT_GUIDE.md',
    'validate-runtime-governance.mjs'
  ]) {
    copyRecursive(path.join(repoRoot, relPath), path.join(installRoot, relPath));
  }

  copyRecursive(
    path.join(repoRoot, '.opencode', 'bin', 'ast-index.exe'),
    path.join(installRoot, 'bin', 'ast-index.exe')
  );

  return installRoot;
}

function runValidator(cwd) {
  return spawnSync('node', [scriptPath], {
    cwd,
    encoding: 'utf8'
  });
}

test('runtime governance requires ast-index skill manifest', () => {
  const fixtureRoot = createRuntimeFixture();
  fs.rmSync(path.join(fixtureRoot, 'skills', 'ast-index'), { recursive: true, force: true });

  const result = runValidator(fixtureRoot);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /skills\/ast-index\/SKILL\.md/i);
});

test('runtime governance fails when planner threshold drifts from canonical 4+ rule', () => {
  const fixtureRoot = createRuntimeFixture();
  const openagentPath = path.join(fixtureRoot, 'agents', 'openagent.md');
  const mutated = fs
    .readFileSync(openagentPath, 'utf8')
    .replace(/if 4\+ files -> `planner` first/g, 'if 10+ files -> `planner` first')
    .replace(/when 4\+ files/g, 'when 10+ files')
    .replace(/\| 4\+ файлов \| planner \|/g, '| 10+ файлов | planner |')
    .replace(/Декомпозиция 4\+ файлов/g, 'Декомпозиция 10+ файлов');
  fs.writeFileSync(openagentPath, mutated, 'utf8');

  const result = runValidator(fixtureRoot);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /planner threshold/i);
});

test('runtime governance fails on legacy runtime agent references', () => {
  const fixtureRoot = createRuntimeFixture();
  const reviewPath = path.join(fixtureRoot, 'context', 'core', 'workflows', 'review.md');
  const mutated = fs
    .readFileSync(reviewPath, 'utf8')
    .replace(/agentом `reviewer`/g, 'агентом `subagents/reviewer`')
    .replace(/агентом `reviewer`/g, 'агентом `subagents/reviewer`')
    .replace(/`reviewer`/g, '`subagents/reviewer`');
  fs.writeFileSync(reviewPath, mutated, 'utf8');

  const result = runValidator(fixtureRoot);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /legacy runtime agent reference/i);
});

test('runtime governance passes for installed .opencode layout', () => {
  const installRoot = createInstalledRuntimeFixture();

  const result = spawnSync('node', [path.join(installRoot, 'validate-runtime-governance.mjs')], {
    cwd: installRoot,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /validation passed/i);
});

test('runtime governance fails on legacy agent references inside skill manifests', () => {
  const fixtureRoot = createRuntimeFixture();
  const skillPath = path.join(fixtureRoot, 'skills', 'context7', 'SKILL.md');
  fs.appendFileSync(skillPath, '\nLegacy ref: subagents/research/externalscout\n', 'utf8');

  const result = runValidator(fixtureRoot);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /skills[\\/]context7[\\/]SKILL\.md/i);
  assert.match(result.stdout + result.stderr, /legacy/i);
});

test('runtime governance fails on legacy skill references in contextscout agent', () => {
  const fixtureRoot = createRuntimeFixture();
  const contextScoutPath = path.join(fixtureRoot, 'agents', 'contextscout.md');
  fs.appendFileSync(contextScoutPath, '\nLegacy skill refs: repomap.md ast-index.md skill/tools/repomap.md\n', 'utf8');

  const result = runValidator(fixtureRoot);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /agents[\\/]contextscout\.md/i);
  assert.match(result.stdout + result.stderr, /legacy/i);
});

test('runtime governance fails when instructions drift back to planner confirm gate', () => {
  const fixtureRoot = createRuntimeFixture();
  const instructionsPath = path.join(fixtureRoot, 'instructions.md');
  const mutated = fs
    .readFileSync(instructionsPath, 'utf8')
    .replace('4+ файлов → planner first (без confirm gate)', '4+ файлов → подтверждение');
  fs.writeFileSync(instructionsPath, mutated, 'utf8');

  const result = runValidator(fixtureRoot);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /instructions\.md/i);
  assert.match(result.stdout + result.stderr, /planner policy/i);
});
