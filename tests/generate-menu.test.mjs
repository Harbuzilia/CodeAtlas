// Tests for scripts/generate-menu.mjs — the generated /menu command card.
// Audit fix (2026-09-16): nested command dirs (command/prompt-engineering/*.md)
// were invisible to the menu and YAML quote wrapping leaked into descriptions.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { makeTmp, rmTmp, runScript, write } from './helpers.mjs';

test('menu lists nested commands and strips YAML description quotes', () => {
  const tmp = makeTmp('menu-');
  try {
    write('command/alpha.md', '---\ndescription: "Alpha description"\n---\nbody', tmp);
    write(
      'command/prompt-engineering/prompt-optimizer.md',
      '---\ndescription: Optimizes prompts\n---\nbody',
      tmp,
    );

    const r = runScript('scripts/generate-menu.mjs', { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /menu\.md regenerated/);

    const menu = fs.readFileSync(path.join(tmp, 'command', 'menu.md'), 'utf8');
    // Both commands counted — nesting must not hide entries.
    assert.match(menu, /Slash-команды \(2\)/);
    // Nested path rendered with forward slashes.
    assert.match(menu, /`\/prompt-engineering\/prompt-optimizer` — Optimizes prompts/);
    // Quote wrapping stripped, so the description renders clean.
    assert.match(menu, /`\/alpha` — Alpha description/);
    assert.doesNotMatch(menu, /"Alpha description"/);
  } finally {
    rmTmp(tmp);
  }
});

test('menu generation excludes the generated menu.md itself', () => {
  const tmp = makeTmp('menu-');
  try {
    write('command/alpha.md', '---\ndescription: first\n---\n', tmp);
    // Stale generated menu from a previous run with a different count.
    write('command/menu.md', 'old menu content\nSlash-команды (7)\n', tmp);

    const r = runScript('scripts/generate-menu.mjs', { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    const menu = fs.readFileSync(path.join(tmp, 'command', 'menu.md'), 'utf8');
    // Regenerated from scratch: the stale count is gone, only alpha counted.
    assert.match(menu, /Slash-команды \(1\)/);
    assert.match(menu, /`\/alpha` — first/);
    assert.doesNotMatch(menu, /Slash-команды \(7\)/);
  } finally {
    rmTmp(tmp);
  }
});
