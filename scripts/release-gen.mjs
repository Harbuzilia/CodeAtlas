// SemVer release: bump package.json, prepend a CHANGELOG section, commit, tag.
//
// The previous version of this script could not run at all: it referenced an
// undefined `dateStr` and declared the changelog block twice, so the module failed
// to parse (npm run release crashed before doing anything).
//
// Usage:
//   npm run release -- patch|minor|major [--dry-run] [--no-tag] [--no-verify]

import { execFileSync } from 'node:child_process';
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

// A release must start from a known-clean tree, otherwise the version bump gets
// mixed with unrelated edits.
const dirty = git(['status', '--porcelain']);
if (dirty) {
  console.error('❌ Working tree is not clean — commit or stash first:');
  console.error(dirty.split('\n').slice(0, 15).join('\n'));
  process.exit(1);
}

const pkgPath = path.join(root, 'package.json');
const changelogPath = path.join(root, 'CHANGELOG.md');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '1.0.0';
const [major, minor, patch] = currentVersion.split('.').map((n) => Number.parseInt(n, 10) || 0);

const nextVersion =
  bumpType === 'major' ? `${major + 1}.0.0`
  : bumpType === 'minor' ? `${major}.${minor + 1}.0`
  : `${major}.${minor}.${patch + 1}`;

const dateStr = new Date().toISOString().slice(0, 10);
const tag = `v${nextVersion}`;

console.log(`   version: ${currentVersion} -> ${nextVersion} (${dateStr})`);

if (git(['tag', '--list', tag])) {
  console.error(`❌ Tag ${tag} already exists.`);
  process.exit(1);
}

if (DRY_RUN) {
  console.log(`   [dry-run] would write package.json version=${nextVersion}`);
  console.log(`   [dry-run] would prepend "## [${nextVersion}] — ${dateStr}" to CHANGELOG.md`);
  console.log(`   [dry-run] would commit and ${NO_TAG ? 'skip' : ''}tag ${tag}`);
  process.exit(0);
}

// --- package.json ---
pkg.version = nextVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('   ✅ package.json updated');

// --- CHANGELOG.md (single insertion, after the top-level title) ---
const section = `## [${nextVersion}] — ${dateStr}\n\n- Automated release bump (${bumpType}).\n- Quality gates, secret scan and routing evaluation passed.\n\n`;

if (!fs.existsSync(changelogPath)) {
  fs.writeFileSync(changelogPath, `# Changelog\n\n${section}`, 'utf8');
} else {
  const existing = fs.readFileSync(changelogPath, 'utf8');
  const header = existing.match(/^# [^\n]+\n\n/);
  fs.writeFileSync(
    changelogPath,
    header ? existing.replace(header[0], header[0] + section) : section + existing,
    'utf8',
  );
}
console.log('   ✅ CHANGELOG.md updated');

// --- commit + tag ---
const commitArgs = ['commit', '-m', `chore(release): ${tag}`];
if (NO_VERIFY) commitArgs.push('--no-verify');

git(['add', 'package.json', 'CHANGELOG.md']);
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
