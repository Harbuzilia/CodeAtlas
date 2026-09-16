// Regression tests for scripts/validate-agent-permissions.mjs.
//
// Audit bug #3 (2026-09-16): the frontmatter parser was blind to nested maps,
// so `permission.bash: { "*": "deny" }` resolved to '' and a perfectly valid
// agent FAILED the check, while a pattern map like { "rm -rf *": "ask" }
// silently left bash enabled with no complaint. These fixtures pin both the
// parser rewrite and the enforcement rules (domain deny / path globs).

import assert from 'node:assert/strict';
import test from 'node:test';
import { makeTmp, rmTmp, runScript, write } from './helpers.mjs';

const GOOD = `---
description: scalar deny
model: anthropic/claude
tools:
  bash: false
  read: true
permission:
  bash: deny
---
body
`;

// Same restriction expressed as a domain-level deny map. The old parser could
// not see the nested map and falsely failed agents like this.
const DENY_MAP = `---
description: deny map
tools:
  bash: false
permission:
  bash:
    "*": deny
---
body
`;

// Pattern maps do NOT deny the domain — a declared tools.bash=false stays
// unenforced, the validator must flag it.
const PATTERN_MAP = `---
description: pattern map
tools:
  bash: false
permission:
  bash:
    "rm -rf *": ask
    "*": ask
---
body
`;

const EDIT_GLOB = `---
description: edit glob
tools:
  read: true
permission:
  edit:
    "docs/**": deny
---
body
`;

function agent(name, frontmatter) {
  const tmp = makeTmp('agent-perm-');
  write(`agents/${name}.md`, frontmatter, tmp);
  return tmp;
}

function run(cwd) {
  return runScript('scripts/validate-agent-permissions.mjs', { cwd });
}

test('scalar deny and deny map both pass', () => {
  const tmp = makeTmp('agent-perm-');
  try {
    write('agents/good.md', GOOD, tmp);
    write('agents/denymap.md', DENY_MAP, tmp);
    const r = run(tmp);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /2 agents checked/);
  } finally {
    rmTmp(tmp);
  }
});

test('pattern map does not enforce tools:false — must fail', () => {
  const tmp = agent('pattern', PATTERN_MAP);
  try {
    const r = run(tmp);
    assert.equal(r.status, 1, 'pattern map leaving bash enabled must exit 1');
    assert.match(r.stdout + r.stderr, /tools\.bash=false is NOT enforced/);
    assert.match(r.stdout + r.stderr, /permission\.bash: "deny"/);
  } finally {
    rmTmp(tmp);
  }
});

test('path glob in permission.edit is reported as ineffective', () => {
  const tmp = agent('editglob', EDIT_GLOB);
  try {
    const r = run(tmp);
    assert.equal(r.status, 1, 'edit path glob must exit 1');
    assert.match(r.stdout + r.stderr, /permission\.edit uses path pattern\(s\)/);
  } finally {
    rmTmp(tmp);
  }
});

test('missing frontmatter and unknown tool keys fail', () => {
  const tmp = makeTmp('agent-perm-');
  try {
    write('agents/broken.md', 'no frontmatter here\n', tmp);
    write('agents/unknown.md', '---\ndescription: x\ntools:\n  frobnicate: false\n---\n', tmp);
    const r = run(tmp);
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, /broken\.md: no YAML frontmatter/);
    assert.match(r.stdout + r.stderr, /unknown tool "frobnicate"/);
  } finally {
    rmTmp(tmp);
  }
});
