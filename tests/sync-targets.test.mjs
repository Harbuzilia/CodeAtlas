// Regression test for scripts/sync-targets.mjs — multi-target sync.
//
// Audit bug #2 (2026-09-16): extraSyncs copied plugin/ into .opencode/.opencode/
// and into every global target's own .opencode/ subdirectory, littering the
// machine with nested mirrors. The fix removed extraSyncs entirely; this test
// pins that behaviour and checks that all four targets get the source dirs.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { makeTmp, rmTmp, runScript, write } from './helpers.mjs';

test('syncs all five targets without nesting .opencode inside .opencode', () => {
  const tmp = makeTmp('sync-targets-');
  const home = makeTmp('sync-targets-home-');
  try {
    // Skills are directories in the real repo (skills/<name>/SKILL.md).
    write('skills/myskill/marker.txt', 'content of skills\n', tmp);
    for (const d of ['agents', 'command', 'context', 'plugin']) {
      write(`${d}/marker.txt`, `content of ${d}\n`, tmp);
    }

    // HOME/USERPROFILE override keeps the "global" targets inside the temp home.
    const r = runScript('scripts/sync-targets.mjs', {
      cwd: tmp,
      env: { USERPROFILE: home, HOME: home },
    });
    assert.equal(r.status, 0, r.stderr);

    // The bug #2 artifact must not reappear...
    assert.ok(
      !fs.existsSync(path.join(tmp, '.opencode', '.opencode')),
      'nested .opencode/.opencode must not exist',
    );
    // ...and the global targets must not grow their own .opencode either.
    for (const global of [
      path.join(home, '.config', 'opencode'),
      path.join(home, '.config', 'pi'),
      path.join(home, '.pi'),
    ]) {
      assert.ok(!fs.existsSync(path.join(global, '.opencode')), `${global} must not contain .opencode/`);
    }

    // The four full targets receive every source dir with its content.
    for (const target of [
      path.join(tmp, '.opencode'),
      path.join(home, '.config', 'opencode'),
      path.join(home, '.config', 'pi'),
      path.join(home, '.pi'),
    ]) {
      for (const d of ['skills', 'agents', 'command', 'context', 'plugin']) {
        const rel = d === 'skills' ? path.join('skills', 'myskill', 'marker.txt') : path.join(d, 'marker.txt');
        assert.ok(fs.existsSync(path.join(target, rel)), `${target}/${rel} must exist`);
      }
    }

    // The Agent Skills standard target is the skills ROOT: no skills/ nesting,
    // and it carries only skills — no agents/commands/plugins.
    const agentsStd = path.join(home, '.agents', 'skills');
    assert.ok(fs.existsSync(path.join(agentsStd, 'myskill', 'marker.txt')), '~/.agents/skills/<skill> layout');
    assert.ok(!fs.existsSync(path.join(agentsStd, 'skills')), 'no nested skills/skills');
    for (const d of ['agents', 'command', 'context', 'plugin']) {
      assert.ok(!fs.existsSync(path.join(agentsStd, d)), `~/.agents/skills must not contain ${d}/`);
    }
  } finally {
    rmTmp(tmp);
    rmTmp(home);
  }
});
