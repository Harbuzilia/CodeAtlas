// Tests for scripts/validate-docs-sync.mjs — the docs-drift gate added in the
// 2026-09-16 audit (commit 048a805 shipped "36 навыков" while disk had 37).
// Fixtures use "3 навыка" (singular-ish plural) on purpose: the PLANS regex
// must accept natural Russian forms, not just the literal "навыков".

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { makeTmp, rmTmp, runScript, write } from './helpers.mjs';

// Note: command/matrix.md is a real command in this repo, so the fixture
// counts it: 3 commands (one, two, matrix) declared everywhere as 3.
function buildFixture() {
  const tmp = makeTmp('docs-sync-');
  for (const s of ['alpha', 'beta', 'gamma']) {
    write(`skills/${s}/SKILL.md`, `---\nname: ${s}\ndescription: skill ${s}\n---\nbody`, tmp);
  }
  write('command/one.md', '---\ndescription: first\n---\nbody', tmp);
  write('command/two.md', '---\ndescription: second\n---\nbody', tmp);
  write(
    'command/menu.md',
    'Slash-команды (4):\n- `/one` — first\n- `/two` — second\n- `/matrix` — matrix\n- `/doctor` — doctor\n',
    tmp,
  );
  write(
    'PLANS.md',
    [
      '# Plans',
      '- **Скиллов в системе**: 3 навыка (100% валидированы).',
      '- **Slash-команд**: 4 (`/one`, `/two`, `/matrix`, `/doctor`).',
      '',
    ].join('\n'),
    tmp,
  );
  write(
    'PROJECT_GUIDE.md',
    '# Guide\n\n## Catalogue\n\n- `alpha`\n- `beta`\n- `gamma`\n',
    tmp,
  );
  write(
    'command/matrix.md',
    '---\ndescription: matrix\n---\n\nРеестр из 3 навыков и 4 slash-команд: alpha, beta, gamma.\n\n```\nValidated Skills (3 total):\n`alpha`, `beta`, `gamma`\n\nSlash Commands (4 total):\n/one, /two, /matrix, /doctor\n```\n',
    tmp,
  );
  write('README.md', '# T\n\n| Скиллы | 3 (test) | `skills/` |\n| Slash-команды | 4 + меню | `command/` |\n', tmp);
  write('command/doctor.md', '---\ndescription: doctor\n---\n\n✅ Skills Inventory    : 3/3 skills verified\n', tmp);
  write(
    'docs/architecture/system_map.md',
    '# Map\n\n- Slash commands: 4 (/one, /two, /matrix, /doctor)\n- Skills: 3 (alpha, beta, gamma)\n',
    tmp,
  );
  return tmp;
}

test('fixture in sync passes', () => {
  const tmp = buildFixture();
  try {
    const r = runScript('scripts/validate-docs-sync.mjs', { cwd: tmp });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /3 skills \/ 4 commands/);
  } finally {
    rmTmp(tmp);
  }
});

test('wrong skill count in PLANS.md fails', () => {
  const tmp = buildFixture();
  try {
    write('skills/delta/SKILL.md', '---\nname: delta\n---\nbody', tmp);
    const r = runScript('scripts/validate-docs-sync.mjs', { cwd: tmp });
    assert.equal(r.status, 1, 'disk has 4 skills while docs claim 3');
    assert.match(r.stdout + r.stderr, /заявлено 3 навык/);
    assert.match(r.stdout + r.stderr, /на диске 4/);
  } finally {
    rmTmp(tmp);
  }
});

test('command missing from the PLANS.md list fails', () => {
  const tmp = buildFixture();
  try {
    write(
      'PLANS.md',
      '- **Скиллов в системе**: 3 навыка.\n- **Slash-команд**: 3 (`/one`, `/matrix`).\n',
      tmp,
    );
    const r = runScript('scripts/validate-docs-sync.mjs', { cwd: tmp });
    assert.equal(r.status, 1, 'two на диске, но /two не в списке');
    assert.match(r.stdout + r.stderr, /\/two есть на диске, но не в списке/);
  } finally {
    rmTmp(tmp);
  }
});

test('stale menu count and missing skill mention fail', () => {
  const tmp = buildFixture();
  try {
    const menuPath = path.join(tmp, 'command', 'menu.md');
    fs.writeFileSync(menuPath, 'Slash-команды (5):\n', 'utf8');
    write(
      'command/matrix.md',
      '---\ndescription: matrix\n---\n\nРеестр из 3 навыков и 3 slash-команд: alpha, beta.\n',
      tmp,
    );
    write('PROJECT_GUIDE.md', '# Guide\n\n## Catalogue\n\n- `alpha`\n- `beta`\n', tmp);
    const r = runScript('scripts/validate-docs-sync.mjs', { cwd: tmp });
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, /menu\.md: заявлено 5 команд/);
    assert.match(r.stdout + r.stderr, /навык `gamma` отсутствует в реестре/);
    assert.match(r.stdout + r.stderr, /PROJECT_GUIDE\.md: навык `gamma`/);
  } finally {
    rmTmp(tmp);
  }
});

test('phantom skill in the matrix registry fails (wave-11 finding)', () => {
  const tmp = buildFixture();
  try {
    // 4 names listed while disk has 3: a skill moved to context/standards but
    // left in the registry used to pass the count-only gate.
    write(
      'command/matrix.md',
      '---\ndescription: matrix\n---\n\nРеестр из 3 навыков.\n\nValidated Skills (3 total):\n`alpha`, `beta`, `gamma`, `websocket-realtime-events`\n\nSlash Commands (4 total):\n/one, /two, /matrix, /doctor\n',
      tmp,
    );
    const r = runScript('scripts/validate-docs-sync.mjs', { cwd: tmp });
    assert.equal(r.status, 1, 'фантом в реестре скиллов должен ронять гейт');
    assert.match(r.stdout + r.stderr, /фантом `websocket-realtime-events`/);
  } finally {
    rmTmp(tmp);
  }
});

test('command missing from the matrix registry list fails', () => {
  const tmp = buildFixture();
  try {
    write(
      'command/matrix.md',
      '---\ndescription: matrix\n---\n\nРеестр из 3 навыков.\n\nValidated Skills (3 total):\n`alpha`, `beta`, `gamma`\n\nSlash Commands (4 total):\n/one, /two, /matrix\n',
      tmp,
    );
    const r = runScript('scripts/validate-docs-sync.mjs', { cwd: tmp });
    assert.equal(r.status, 1, 'пропущенная команда в реестре должна ронять гейт');
    assert.match(r.stdout + r.stderr, /команда \/doctor есть на диске, но отсутствует в списке/);
  } finally {
    rmTmp(tmp);
  }
});
