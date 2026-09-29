// Shared utilities for the hermetic script tests.
//
// Scripts under test resolve their repo root from process.cwd(), import only
// node builtins and write to the cwd (or to $USERPROFILE/$HOME). That makes
// them safe to exercise in an isolated temp directory via a child process:
// nothing in the real repo is touched, and no test depends on repo state.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const repoRoot = path.resolve(import.meta.dirname, '..');

/**
 * Run a repo script as a child process from `cwd` with an extended env.
 * Returns the full spawn result (status / stdout / stderr).
 */
export function runScript(relScript, { cwd, env = {}, args = [] } = {}) {
  return spawnSync(process.execPath, [path.join(repoRoot, relScript), ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

/** Create a fresh temp directory (caller must remove it in a finally block). */
export function makeTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Write `content` to `rel` under `base`, creating parent directories. */
export function write(rel, content, base) {
  const p = path.join(base, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

/** Best-effort recursive removal for finally blocks. */
export function rmTmp(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
