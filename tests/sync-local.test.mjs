// Regression tests for scripts/sync-local.mjs — the .opencode/ runtime mirror.
//
// Audit bug #1 (2026-09-16): a fresh clone had no .opencode/package.json, so
// validate-runtime-governance.mjs crashed with ENOENT and validate:all /
// smoke were permanently red on CI. The mirror must generate that file, and
// --check must detect when it disappears or drifts.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { makeTmp, rmTmp, runScript, write } from './helpers.mjs';

const PKG = JSON.stringify(
  {
    name: 'fixture',
    version: '1.0.0',
    dependencies: { '@opencode-ai/plugin': '1.18.18' },
  },
  null,
  2,
);

function buildFixture() {
  const tmp = makeTmp('sync-local-');
  write('package.json', PKG, tmp);
  write('agents/orchestrator.md', '---\ndescription: agent\n---\nbody', tmp);
  write('command/run.md', '---\ndescription: cmd\n---\nbody', tmp);
  write('context/core/rules.md', 'rules', tmp);
  write('plugin/halt-guard.js', 'export default () => ({});\n', tmp);
  write('skills/git/SKILL.md', '---\nname: git\n---\nbody', tmp);
  return tmp;
}

test('mirror copies source dirs and generates .opencode/package.json', () => {
  const tmp = buildFixture();
  try {
    const r = runScript('scripts/sync-local.mjs', { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    for (const rel of [
      'agents/orchestrator.md',
      'command/run.md',
      'context/core/rules.md',
      'plugin/halt-guard.js',
      'skills/git/SKILL.md',
    ]) {
      assert.ok(fs.existsSync(path.join(tmp, '.opencode', rel)), `.opencode/${rel} must exist`);
    }
    // Generated runtime package: ESM + the plugin version pinned by the root package.
    const runtimePkg = JSON.parse(fs.readFileSync(path.join(tmp, '.opencode', 'package.json'), 'utf8'));
    assert.equal(runtimePkg.type, 'module');
    assert.equal(runtimePkg.dependencies['@opencode-ai/plugin'], '1.18.18');
  } finally {
    rmTmp(tmp);
  }
});

test('--check passes on a fresh mirror', () => {
  const tmp = buildFixture();
  try {
    assert.equal(runScript('scripts/sync-local.mjs', { cwd: tmp }).status, 0, 'mirror run failed');
    const check = runScript('scripts/sync-local.mjs', { cwd: tmp, args: ['--check'] });
    assert.equal(check.status, 0, check.stdout + check.stderr);
    assert.match(check.stdout, /in sync with source/);
  } finally {
    rmTmp(tmp);
  }
});

test('--check detects modified, stale and missing files', () => {
  const tmp = buildFixture();
  try {
    runScript('scripts/sync-local.mjs', { cwd: tmp });

    // Modified: mirrored file diverges from source.
    write('.opencode/agents/orchestrator.md', 'tampered', tmp);
    let check = runScript('scripts/sync-local.mjs', { cwd: tmp, args: ['--check'] });
    assert.equal(check.status, 1, 'drift (differs) must exit 1');
    assert.match(check.stdout + check.stderr, /agents\/orchestrator\.md: differs/);

    // Stale: runtime file with no source counterpart.
    write('.opencode/agents/ghost.md', 'ghost', tmp);
    check = runScript('scripts/sync-local.mjs', { cwd: tmp, args: ['--check'] });
    assert.equal(check.status, 1, 'drift (stale) must exit 1');
    assert.match(check.stdout + check.stderr, /agents\/ghost\.md: stale/);

    // Missing: the CI-fatal regression — no generated runtime package.json.
    fs.rmSync(path.join(tmp, '.opencode', 'package.json'));
    check = runScript('scripts/sync-local.mjs', { cwd: tmp, args: ['--check'] });
    assert.equal(check.status, 1, 'missing .opencode/package.json must exit 1');
    assert.match(check.stdout + check.stderr, /\.opencode\/package\.json: missing/);
    assert.match(check.stdout + check.stderr, /npm run sync:local/);
  } finally {
    rmTmp(tmp);
  }
});

test('mirror replaces wholesale: re-sync removes deleted source files', () => {
  const tmp = buildFixture();
  try {
    runScript('scripts/sync-local.mjs', { cwd: tmp });
    fs.rmSync(path.join(tmp, 'agents', 'orchestrator.md'));
    const r = runScript('scripts/sync-local.mjs', { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!fs.existsSync(path.join(tmp, '.opencode', 'agents', 'orchestrator.md')));
    // The stale cleanup also covers files the runtime accumulated on its own.
    write('.opencode/agents/ghost.md', 'ghost', tmp);
    runScript('scripts/sync-local.mjs', { cwd: tmp });
    assert.ok(!fs.existsSync(path.join(tmp, '.opencode', 'agents', 'ghost.md')));
  } finally {
    rmTmp(tmp);
  }
});
