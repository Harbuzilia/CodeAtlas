// Tests for scripts/model-presets.mjs — presets-as-data model assignment.
//
// The script rewrites `model:`/`variant:` lines in agent frontmatter. Two
// failure modes are pinned here: a preset switching to a variant-less model
// must REMOVE the stale variant line, and CRLF frontmatter must keep exactly
// one line ending per line (an earlier version wrote \r\r\n, which made git
// flag whole files as modified).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { makeTmp, rmTmp, runScript, write } from './helpers.mjs';

function buildFixture() {
  const tmp = makeTmp('model-presets-');
  write(
    'opencode.json',
    JSON.stringify(
      {
        provider: {
          google: {
            models: {
              pro: { variants: { low: {}, high: {} } },
              flash: { variants: { minimal: {} } },
              sonnet: {},
            },
          },
        },
      },
      null,
      2,
    ),
    tmp,
  );
  write(
    'config/model-presets.json',
    JSON.stringify(
      {
        active: 'a',
        presets: {
          a: {
            description: 'preset A',
            agents: {
              coder: { model: 'google/pro', variant: 'high' },
              scout: { model: 'google/flash', variant: 'minimal' },
            },
          },
          b: {
            description: 'preset B',
            agents: {
              coder: { model: 'google/flash' },
              scout: { model: 'google/sonnet' },
            },
          },
        },
      },
      null,
      2,
    ),
    tmp,
  );
  write('agents/coder.md', '---\ndescription: coder\nmode: subagent\ntemperature: 0\nsteps: 30\n---\nbody\n', tmp);
  write('agents/scout.md', '---\ndescription: scout\nmode: subagent\ntemperature: 0\nsteps: 20\n---\nbody\n', tmp);
  return tmp;
}

const readAgent = (tmp, name) => fs.readFileSync(path.join(tmp, 'agents', `${name}.md`), 'utf8');

test('apply writes model and variant, then a switch removes the stale variant', () => {
  const tmp = buildFixture();
  try {
    const a = runScript('scripts/model-presets.mjs', { cwd: tmp, args: ['--apply', 'a'] });
    assert.equal(a.status, 0, a.stdout + a.stderr);
    assert.match(readAgent(tmp, 'coder'), /^model: google\/pro$/m);
    assert.match(readAgent(tmp, 'coder'), /^variant: high$/m);
    assert.match(readAgent(tmp, 'scout'), /^model: google\/flash$/m);
    assert.match(readAgent(tmp, 'scout'), /^variant: minimal$/m);

    // Preset B has no variants: the stale variant lines must be gone.
    const b = runScript('scripts/model-presets.mjs', { cwd: tmp, args: ['--apply', 'b'] });
    assert.equal(b.status, 0, b.stdout + b.stderr);
    const coder = readAgent(tmp, 'coder');
    assert.match(coder, /^model: google\/flash$/m);
    assert.doesNotMatch(coder, /^variant:/m);
    assert.doesNotMatch(readAgent(tmp, 'scout'), /^variant:/m);

    // Active marker flips in the presets file.
    const presetsRaw = fs.readFileSync(path.join(tmp, 'config', 'model-presets.json'), 'utf8');
    assert.match(presetsRaw, /"active": "b"/);
  } finally {
    rmTmp(tmp);
  }
});

test('--check passes after apply and fails on drift', () => {
  const tmp = buildFixture();
  try {
    runScript('scripts/model-presets.mjs', { cwd: tmp, args: ['--apply', 'a'] });
    const ok = runScript('scripts/model-presets.mjs', { cwd: tmp, args: ['--check'] });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);

    write('agents/coder.md', '---\ndescription: coder\nmode: subagent\nmodel: google/sonnet\ntemperature: 0\nsteps: 30\n---\nbody\n', tmp);
    const drift = runScript('scripts/model-presets.mjs', { cwd: tmp, args: ['--check'] });
    assert.equal(drift.status, 1);
    assert.match(drift.stdout + drift.stderr, /coder: model "google\/sonnet" ≠ пресет "google\/pro"/);
    assert.match(drift.stdout + drift.stderr, /npm run models:apply/);
  } finally {
    rmTmp(tmp);
  }
});

test('a preset referencing an unknown model is rejected', () => {
  const tmp = buildFixture();
  try {
    write('agents/ghost.md', '---\ndescription: ghost\nmode: subagent\n---\nbody\n', tmp);
    // ghost.md breaks preset completeness; unknown-model breaks the catalog check.
    write(
      'config/model-presets.json',
      JSON.stringify({
        active: 'bad',
        presets: {
          bad: {
            description: 'bad',
            agents: {
              coder: { model: 'google/minimax-m9' },
              scout: { model: 'google/sonnet' },
              ghost: { model: 'google/sonnet' },
            },
          },
        },
      }),
      tmp,
    );
    const r = runScript('scripts/model-presets.mjs', { cwd: tmp, args: ['--apply', 'bad'] });
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, /модель "google\/minimax-m9" отсутствует в каталоге/);
  } finally {
    rmTmp(tmp);
  }
});

test('CRLF frontmatter keeps exactly one line ending per inserted line', () => {
  const tmp = makeTmp('model-presets-');
  try {
    write('opencode.json', '{"provider":{"google":{"models":{"pro":{"variants":{"high":{}}}}}}}', tmp);
    write(
      'config/model-presets.json',
      JSON.stringify({
        active: 'a',
        presets: { a: { description: 'a', agents: { coder: { model: 'google/pro', variant: 'high' } } } },
      }),
      tmp,
    );
    const file = path.join(tmp, 'agents', 'coder.md');
    fs.mkdirSync(path.join(tmp, 'agents'), { recursive: true });
    fs.writeFileSync(
      file,
      '---\r\ndescription: coder\r\nmode: subagent\r\ntemperature: 0\r\nsteps: 30\r\n---\r\nbody\r\n',
      'utf8',
    );

    const r = runScript('scripts/model-presets.mjs', { cwd: tmp, args: ['--apply', 'a'] });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /\r\r/, 'no double CR anywhere');
    assert.match(text, /mode: subagent\r\nmodel: google\/pro\r\nvariant: high\r\ntemperature: 0/);
    // The body after the frontmatter is untouched.
    assert.match(text, /---\r\nbody\r\n$/);
  } finally {
    rmTmp(tmp);
  }
});

test('--list shows presets with the active marker', () => {
  const tmp = buildFixture();
  try {
    const r = runScript('scripts/model-presets.mjs', { cwd: tmp, args: ['--list'] });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /- a ← активный/);
    assert.match(r.stdout, /- b:/);
  } finally {
    rmTmp(tmp);
  }
});
