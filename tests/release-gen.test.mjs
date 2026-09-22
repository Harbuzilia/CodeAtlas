// Tests for scripts/release-gen.mjs — the SemVer release pipeline.
//
// The audit (2026-09-16) found the script could not run at all and, once
// patched, skipped the documented gates, left registry.json at the old version
// and wrote a placeholder changelog. These tests drive the full pipeline in a
// disposable git repo: real gates (stubbed npm scripts), a real tag history,
// real Conventional Commits, real commits created by the script itself.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { makeTmp, rmTmp, runScript, write } from './helpers.mjs';

const PASS = 'node -e "process.exit(0)"';
const FAIL = 'node -e "process.exit(1)"';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/**
 * Build a disposable release repo: stub gate scripts, hand-formatted registry
 * (4-space indent — the surgical bump must preserve it), a CHANGELOG with the
 * `---` marker, one tagged initial commit and two conventional commits.
 */
function buildRepo({ validateScript = PASS } = {}) {
  const tmp = makeTmp('release-');
  write(
    'package.json',
    JSON.stringify(
      {
        name: 'fixture',
        version: '1.0.0',
        scripts: {
          'validate:all': validateScript,
          'scan:secrets': PASS,
          'eval:routes': PASS,
        },
      },
      null,
      2,
    ) + '\n',
    tmp,
  );
  write('registry.json', '{\n    "name": "fixture",\n    "version": "1.0.0",\n    "skills": []\n}\n', tmp);
  write(
    'CHANGELOG.md',
    '# Changelog\n\nIntro paragraph.\n\n---\n\n## [2026-01-01] — Old\n\nold entry\n',
    tmp,
  );
  git(tmp, 'init', '-q');
  git(tmp, 'config', 'user.email', 'test@example.com');
  git(tmp, 'config', 'user.name', 'Test');
  git(tmp, 'add', '-A');
  git(tmp, 'commit', '-q', '-m', 'chore: initial scaffold');
  git(tmp, 'tag', 'v0.9.0');

  write('feature.txt', 'x\n', tmp);
  git(tmp, 'add', 'feature.txt');
  git(tmp, 'commit', '-q', '-m', 'feat: add feature module');
  write('fix.txt', 'x\n', tmp);
  git(tmp, 'add', 'fix.txt');
  git(tmp, 'commit', '-q', '-m', 'fix: repair crash on start');
  return tmp;
}

const release = (cwd, args) => runScript('scripts/release-gen.mjs', { cwd, args });

test('dry-run: gates pass, nothing on disk changes', () => {
  const tmp = buildRepo();
  try {
    const r = release(tmp, ['minor', '--dry-run']);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /would bump package\.json AND registry\.json: 1\.0\.0 -> 1\.1\.0/);
    assert.match(r.stdout, /Release v1\.1\.0/);
    assert.equal(git(tmp, 'status', '--porcelain'), '', 'dry-run must not touch tracked files');
    assert.equal(JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8')).version, '1.0.0');
  } finally {
    rmTmp(tmp);
  }
});

test('real release: bump both files, changelog from commits, no tag with --no-tag', () => {
  const tmp = buildRepo();
  try {
    const r = release(tmp, ['minor', '--no-tag', '--no-verify']);
    assert.equal(r.status, 0, r.stdout + r.stderr);

    // package.json bumped and re-serialized.
    const pkg = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8'));
    assert.equal(pkg.version, '1.1.0');

    // registry.json bumped surgically: 4-space hand formatting survives.
    const registryRaw = fs.readFileSync(path.join(tmp, 'registry.json'), 'utf8');
    assert.match(registryRaw, /\n {4}"version": "1\.1\.0"/);
    assert.equal(JSON.parse(registryRaw).version, '1.1.0');

    // CHANGELOG: new section after `---`, grouped by Conventional Commits type.
    const changelog = fs.readFileSync(path.join(tmp, 'CHANGELOG.md'), 'utf8');
    const date = new Date().toISOString().slice(0, 10);
    assert.match(changelog, new RegExp(`## \\[${date}\\] — Release v1\\.1\\.0`));
    assert.match(changelog, /### 🚀 Новые возможности/);
    assert.match(changelog, /- feat: add feature module \(`/);
    assert.match(changelog, /### 🐛 Исправления/);
    assert.match(changelog, /- fix: repair crash on start \(`/);
    assert.match(changelog, /коммиты с v0\.9\.0: 2/);
    // Intro and the old entry stay in place, new section sits between them.
    const intro = changelog.indexOf('Intro paragraph.');
    const newSection = changelog.indexOf('Release v1.1.0');
    const oldSection = changelog.indexOf('2026-01-01');
    assert.ok(intro < newSection && newSection < oldSection, 'changelog order: intro, new section, old entries');

    // Release commit created; tag skipped.
    assert.equal(git(tmp, 'log', '-1', '--pretty=%s'), 'chore(release): v1.1.0');
    assert.equal(git(tmp, 'status', '--porcelain'), '', 'release must leave a clean tree');
    assert.equal(git(tmp, 'tag', '--list', 'v1.1.0'), '', '--no-tag must skip the tag');
  } finally {
    rmTmp(tmp);
  }
});

test('release creates an annotated tag when --no-tag is absent', () => {
  const tmp = buildRepo();
  try {
    // patch bump despite feat commits: only a non-blocking warning (console.warn → stderr), must proceed.
    const r = release(tmp, ['patch', '--no-verify']);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout + r.stderr, /suggests a minor bump/);
    assert.match(git(tmp, 'tag', '--list', 'v1.0.1'), /v1\.0\.1/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8')).version, '1.0.1');
  } finally {
    rmTmp(tmp);
  }
});

test('version drift between package.json and registry.json blocks the release', () => {
  const tmp = buildRepo();
  try {
    write('registry.json', '{\n    "version": "0.9.9"\n}\n', tmp);
    git(tmp, 'add', 'registry.json');
    git(tmp, 'commit', '-q', '-m', 'chore: drift registry');
    const r = release(tmp, ['minor', '--dry-run']);
    assert.equal(r.status, 1, 'drift must block the release');
    assert.match(r.stdout + r.stderr, /Version drift: package\.json=1\.0\.0 but registry\.json=0\.9\.9/);
  } finally {
    rmTmp(tmp);
  }
});

test('a failing gate blocks the release before any file is touched', () => {
  const tmp = buildRepo({ validateScript: FAIL });
  try {
    const r = release(tmp, ['minor']);
    assert.equal(r.status, 1, 'a red gate must block the release');
    assert.match(r.stdout + r.stderr, /Gate FAILED: npm run validate:all/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8')).version, '1.0.0');
  } finally {
    rmTmp(tmp);
  }
});
