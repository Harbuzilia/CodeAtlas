// SemVer release with real gates and a Conventional Commits changelog.
//
// Pipeline (mirrors command/release.md):
//   1. clean-tree check (dry-run may proceed with a warning)
//   2. quality gates: validate:all, scan:secrets, eval:routes — all must pass
//   3. collect commits since the last tag, group by Conventional Commits type
//   4. bump package.json AND registry.json (surgically, preserving formatting)
//   5. prepend the release section to CHANGELOG.md
//   6. commit (chore(release): vX.Y.Z) and annotated tag vX.Y.Z
//
// Usage:
//   npm run release -- patch|minor|major [--dry-run] [--no-tag] [--no-verify]
//
// History: an earlier version of this script could not run at all (undefined
// `dateStr`, changelog block declared twice); then it ran but skipped the
// documented gates, wrote a placeholder changelog line and left registry.json
// at the old version. This implementation does what command/release.md says.

import { execSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const bumpType = ['patch', 'minor', 'major'].includes(args[0]) ? args[0] : 'patch';
const DRY_RUN = args.includes('--dry-run');
const NO_TAG = args.includes('--no-tag');
const NO_VERIFY = args.includes('--no-verify');

console.log(`--- 🏷️  SemVer release (${bumpType})${DRY_RUN ? ' [dry-run]' : ''} ---`);

function git(gitArgs, { allowFail = false } = {}) {
  try {
    return execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    const err = ((e.stderr || '') + (e.message || '')).toString().trim();
    if (!allowFail) {
      console.error(`\n❌ git ${gitArgs.join(' ')} failed:\n${err}`);
      process.exit(1);
    }
    return null;
  }
}

// --- 1. clean tree (a release bump must not mix with unrelated edits) ---
const dirty = git(['status', '--porcelain']);
if (dirty && DRY_RUN) {
  console.warn('   ⚠️ tree is dirty — a real release requires a clean tree (see below)');
  console.warn(dirty.split('\n').slice(0, 10).join('\n'));
} else if (dirty) {
  console.error('❌ Working tree is not clean — commit or stash first:');
  console.error(dirty.split('\n').slice(0, 15).join('\n'));
  process.exit(1);
}

// --- 2. quality gates ---
const GATES = [
  { label: 'validate:all', cmd: 'npm run validate:all' },
  { label: 'scan:secrets', cmd: 'npm run scan:secrets' },
  { label: 'eval:routes', cmd: 'npm run eval:routes' },
];

for (const gate of GATES) {
  const start = performance.now();
  console.log(`   ▶ gate: ${gate.cmd}`);
  try {
    execSync(gate.cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(`   ✅ ${gate.label} (${(performance.now() - start).toFixed(0)}ms)`);
  } catch (e) {
    const out = ((e.stdout || '') + (e.stderr || '')).toString().trim();
    console.error(`\n❌ Gate FAILED: ${gate.cmd}\n${out.split('\n').slice(-20).join('\n')}`);
    console.error('   A release is only possible with all gates green. Fix the errors above and re-run.');
    process.exit(1);
  }
}

// --- versions ---
const pkgPath = path.join(root, 'package.json');
const registryPath = path.join(root, 'registry.json');
const changelogPath = path.join(root, 'CHANGELOG.md');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const registryRaw = fs.readFileSync(registryPath, 'utf8');
const registry = JSON.parse(registryRaw);
const currentVersion = pkg.version || '1.0.0';
if (registry.version !== currentVersion) {
  console.error(
    `❌ Version drift: package.json=${currentVersion} but registry.json=${registry.version}. ` +
      'Align them manually before releasing.',
  );
  process.exit(1);
}

const [major, minor, patch] = currentVersion.split('.').map((n) => Number.parseInt(n, 10) || 0);
const nextVersion =
  bumpType === 'major' ? `${major + 1}.0.0`
  : bumpType === 'minor' ? `${major}.${minor + 1}.0`
  : `${major}.${minor}.${patch + 1}`;

const dateStr = new Date().toISOString().slice(0, 10);
const tag = `v${nextVersion}`;

if (git(['tag', '--list', tag])) {
  console.error(`❌ Tag ${tag} already exists.`);
  process.exit(1);
}

// --- 3. changelog from Conventional Commits since the last tag ---
const lastTag = git(['describe', '--tags', '--abbrev=0'], { allowFail: true });
const logRange = lastTag ? [`${lastTag}..HEAD`] : ['HEAD'];
const logRaw = git(['log', '--pretty=format:%H%x1f%s%x1f%b%x1e', ...logRange]);
const commits = logRaw
  .split('\x1e')
  .map((raw) => raw.replace(/^\s+/, ''))
  .filter(Boolean)
  .map((raw) => {
    const [hash, subject, body] = raw.split('\x1f');
    return { hash: (hash || '').trim(), subject: (subject || '').trim(), body: (body || '').trim() };
  });

const CC_RE = /^(feat|fix|perf|docs|refactor|test|chore|build|ci|style)(?:\([^)]*\))?(!)?:\s+(.*)$/i;
const GROUP_ORDER = [
  { key: 'breaking', title: '### 💥 Breaking Changes' },
  { key: 'feat', title: '### 🚀 Новые возможности' },
  { key: 'fix', title: '### 🐛 Исправления' },
  { key: 'perf', title: '### ⚡ Производительность' },
  { key: 'docs', title: '### 📚 Документация' },
  { key: 'other', title: '### 🔧 Прочее' },
];
const grouped = Object.fromEntries(GROUP_ORDER.map((g) => [g.key, []]));

for (const c of commits) {
  const m = c.subject.match(CC_RE);
  const breaking = (m && m[2] === '!') || /BREAKING CHANGE/i.test(c.body);
  const type = m ? m[1].toLowerCase() : null;
  const text = m ? `${m[1]}${m[2] || ''}: ${m[3]}` : c.subject;
  const entry = `- ${text} (\`${c.hash.slice(0, 7)}\`)`;
  if (breaking) grouped.breaking.push(entry);
  else if (type === 'feat') grouped.feat.push(entry);
  else if (type === 'fix') grouped.fix.push(entry);
  else if (type === 'perf') grouped.perf.push(entry);
  else if (type === 'docs') grouped.docs.push(entry);
  else grouped.other.push(entry);
}

// Bump-type sanity: if the commits say otherwise, say so (non-blocking).
const suggested = grouped.breaking.length > 0 ? 'major' : grouped.feat.length > 0 ? 'minor' : 'patch';
if (suggested !== bumpType) {
  console.warn(
    `   ⚠️ commit history suggests a ${suggested} bump (breaking: ${grouped.breaking.length}, feat: ` +
      `${grouped.feat.length}, fix: ${grouped.fix.length}), you chose ${bumpType}.`,
  );
}

let changelogBody = grouped.breaking.concat(grouped.feat, grouped.fix, grouped.perf, grouped.docs, grouped.other);
if (changelogBody.length === 0) {
  changelogBody = ['- Нет коммитов с прошлого тега — релиз-маркер без изменений.'];
}

const since = lastTag ? `коммиты с ${lastTag}` : 'все коммиты (тегов ещё нет)';
const section =
  `## [${dateStr}] — Release v${nextVersion}\n\n` +
  `Автоматический релиз (${bumpType} bump, ${since}: ${commits.length}). ` +
  'Гейты validate:all / scan:secrets / eval:routes пройдены.\n\n' +
  GROUP_ORDER.filter((g) => grouped[g.key].length > 0)
    .map((g) => `${g.title}\n${grouped[g.key].join('\n')}\n`)
    .join('\n') +
  '\n';

console.log(`   version: ${currentVersion} -> ${nextVersion} (${dateStr}), ${commits.length} commits since ${lastTag ?? 'start'}`);

if (DRY_RUN) {
  console.log('   [dry-run] gates: validate:all / scan:secrets / eval:routes — PASSED');
  console.log(`   [dry-run] would bump package.json AND registry.json: ${currentVersion} -> ${nextVersion}`);
  console.log(`   [dry-run] would prepend CHANGELOG.md section "## [${dateStr}] — Release v${nextVersion}"`);
  console.log('   [dry-run] changelog preview:');
  for (const line of section.split('\n').slice(0, 14)) console.log(`      ${line}`);
  console.log(`   [dry-run] would commit "chore(release): ${tag}"${NO_VERIFY ? ' with --no-verify' : ''}`);
  console.log(NO_TAG ? '   [dry-run] tag would be SKIPPED (--no-tag)' : `   [dry-run] would create annotated tag ${tag}`);
  console.log('   [dry-run] no tracked files were modified');
  process.exit(0);
}

// --- 4. package.json ---
pkg.version = nextVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('   ✅ package.json updated');

// --- registry.json (surgical replace: keep the hand-written formatting) ---
const versionRe = new RegExp(`("version"\\s*:\\s*)"${currentVersion.replace(/\./g, '\\.')}"`);
if (!versionRe.test(registryRaw)) {
  console.error(`❌ registry.json: expected top-level "version": "${currentVersion}" — not found.`);
  process.exit(1);
}
fs.writeFileSync(registryPath, registryRaw.replace(versionRe, `$1"${nextVersion}"`), 'utf8');
console.log('   ✅ registry.json updated');

// --- 5. CHANGELOG.md (insert after the `---` separator under the intro) ---
if (!fs.existsSync(changelogPath)) {
  fs.writeFileSync(changelogPath, `# Changelog\n\n---\n\n${section}`, 'utf8');
} else {
  const existing = fs.readFileSync(changelogPath, 'utf8');
  // `m` flag: the separator is a full line but NOT the first line of the file —
  // the real CHANGELOG.md opens with a `#` title, then the intro, then `---`.
  // Anchored at string start, the marker never matched and the new section was
  // prepended above the title.
  const marker = existing.match(/^---\r?\n/m);
  fs.writeFileSync(
    changelogPath,
    marker ? existing.replace(marker[0], marker[0] + '\n' + section) : section + existing,
    'utf8',
  );
}
console.log('   ✅ CHANGELOG.md updated');

// --- 6. commit + tag ---
const commitArgs = ['commit', '-m', `chore(release): ${tag}`];
if (NO_VERIFY) commitArgs.push('--no-verify');

git(['add', 'package.json', 'registry.json', 'CHANGELOG.md']);
const commit = git(commitArgs, { allowFail: true });
if (commit === null) {
  console.error('   ❌ Commit failed (pre-commit hook blocks commits on main?).');
  console.error('      Create a branch first, or re-run with --no-verify for a release commit.');
  console.error('      Files were updated and staged — nothing was lost.');
  process.exit(1);
}
console.log(`   ✅ committed ${tag}`);

if (NO_TAG) {
  console.log('   (--no-tag: skipping tag)');
} else {
  git(['tag', '-a', tag, '-m', `Release ${tag}`]);
  console.log(`   ✅ tag ${tag} created`);
}

console.log(`\n🎉 Release ${tag} ready. Push with: git push && git push origin ${tag}`);
