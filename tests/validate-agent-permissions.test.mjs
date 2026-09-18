// Tests for scripts/validate-agent-permissions.mjs.
//
// The pack dropped the deprecated `tools:` maps (opencode ignores them in
// favour of permission; since 1.18.26 they can even override user rules —
// issue #46873). The gate now enforces permission-only agents:
//   - a tools: map is a failure, wherever it reappears
//   - every agent must have a permission: block
//   - path globs in permission.edit are reported as ineffective
//   - nested maps (deny maps, per-command bash patterns) parse correctly

import assert from 'node:assert/strict';
import test from 'node:test';
import { makeTmp, rmTmp, runScript, write } from './helpers.mjs';

const GOOD = `---
description: scalar deny
mode: subagent
temperature: 0
permission:
  bash: deny
  edit: allow
---
body
`;

// Domain-level deny expressed as a map — the parser must see nested maps.
const DENY_MAP = `---
description: deny map
permission:
  bash:
    "*": deny
  task: deny
---
body
`;

// Per-command bash patterns are legal permission rules (not a domain deny,
// not an ineffective path glob) — they must pass.
const COMMAND_PATTERNS = `---
description: command patterns
permission:
  bash:
    "rm -rf *": ask
    "sudo *": deny
    "*": ask
  edit: allow
  task: deny
---
body
`;

const TOOLS_MAP = `---
description: legacy tools
tools:
  bash: false
  read: true
permission:
  bash: deny
---
body
`;

const NO_PERMISSION = `---
description: no permission block
mode: subagent
temperature: 0
---
body
`;

const EDIT_GLOB = `---
description: edit glob
permission:
  edit:
    "docs/**": deny
---
body
`;

function run(cwd) {
  return runScript('scripts/validate-agent-permissions.mjs', { cwd });
}

test('permission-only agents pass (scalar deny, deny map, command patterns)', () => {
  const tmp = makeTmp('agent-perm-');
  try {
    write('agents/good.md', GOOD, tmp);
    write('agents/denymap.md', DENY_MAP, tmp);
    write('agents/patterns.md', COMMAND_PATTERNS, tmp);
    const r = run(tmp);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /3 agents checked/);
    assert.match(r.stdout, /permission-only/);
  } finally {
    rmTmp(tmp);
  }
});

test('a deprecated tools: map is rejected even with a correct permission block', () => {
  const tmp = makeTmp('agent-perm-');
  try {
    write('agents/legacy.md', TOOLS_MAP, tmp);
    const r = run(tmp);
    assert.equal(r.status, 1, 'tools maps must exit 1');
    assert.match(r.stdout + r.stderr, /deprecated `tools:` map present/);
    assert.match(r.stdout + r.stderr, /#46873/);
  } finally {
    rmTmp(tmp);
  }
});

test('missing permission block and missing frontmatter fail', () => {
  const tmp = makeTmp('agent-perm-');
  try {
    write('agents/noperm.md', NO_PERMISSION, tmp);
    write('agents/broken.md', 'no frontmatter here\n', tmp);
    const r = run(tmp);
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, /noperm\.md: no `permission:` block/);
    assert.match(r.stdout + r.stderr, /broken\.md: no YAML frontmatter/);
  } finally {
    rmTmp(tmp);
  }
});

test('path glob in permission.edit is reported as ineffective', () => {
  const tmp = makeTmp('agent-perm-');
  try {
    write('agents/editglob.md', EDIT_GLOB, tmp);
    const r = run(tmp);
    assert.equal(r.status, 1, 'edit path glob must exit 1');
    assert.match(r.stdout + r.stderr, /permission\.edit uses path pattern\(s\)/);
  } finally {
    rmTmp(tmp);
  }
});

test('unknown permission keys fail', () => {
  const tmp = makeTmp('agent-perm-');
  try {
    write('agents/unknown.md', '---\ndescription: x\npermission:\n  frobnicate: deny\n---\n', tmp);
    const r = run(tmp);
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, /unknown permission key "frobnicate"/);
  } finally {
    rmTmp(tmp);
  }
});
