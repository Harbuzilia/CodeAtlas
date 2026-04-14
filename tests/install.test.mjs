import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const scriptPath = path.join(repoRoot, 'scripts', 'install.mjs');

test('install dry-run includes bundled ast-index binary', () => {
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'install-dry-run-'));

  const result = spawnSync('node', [scriptPath, '--dry-run', '--yes', `--target=${targetRoot}`], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /bin[\\/]ast-index\.exe/i);
});

test('install runs post-install validation against installed .opencode root', () => {
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'install-runtime-'));

  const result = spawnSync('node', [scriptPath, '--yes', `--target=${targetRoot}`], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.doesNotMatch(result.stdout, /Validation had warnings/i);
  assert.match(result.stdout, /Runtime governance validation passed\.|validation passed/i);
});
