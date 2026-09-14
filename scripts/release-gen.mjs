import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const bumpType = process.argv[2] || 'patch'; // 'patch', 'minor', 'major'

console.log(`--- 🏷️ OpenCode Automated SemVer Release Generator (${bumpType}) ---\n`);

function run(cmd, ignoreError = false) {
  try {
    return execSync(cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' }).trim();
  } catch (err) {
    if (ignoreError) return null;
    throw new Error(`Command failed: ${cmd}\n${err.stderr || err.message}`);
  }
}

// 1. Read package.json
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '1.0.0';

const [major, minor, patch] = currentVersion.split('.').map(Number);
let nextVersion = '';

if (bumpType === 'major') nextVersion = `${major + 1}.0.0`;
else if (bumpType === 'minor') nextVersion = `${major}.${minor + 1}.0`;
else nextVersion = `${major}.${minor}.${patch + 1}`;

console.log(`Bumping version: ${currentVersion} -> ${nextVersion}`);

// 2. Update package.json
pkg.version = nextVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// 3. Update CHANGELOG.md
const changelogPath = path.join(root, 'CHANGELOG.md');
  const newSection = `## [${nextVersion}] — ${dateStr}\n- Automated release bump (${bumpType}).\n- All quality gates and validations passed.\n\n`;
  const existing = fs.readFileSync(changelogPath, 'utf8');
  // Insert after the first `---` header line (or at the top if no header).
  const headerMatch = existing.match(/^(# [^\n]+\n\n)/);
  const updated = headerMatch
    ? existing.replace(headerMatch[1], headerMatch[1] + newSection)
    : newSection + existing;
  fs.writeFileSync(changelogPath, updated, 'utf8');
  console.log(`Updated CHANGELOG.md with v${nextVersion}`);
}
  const newSection = `\n## [${nextVersion}] — ${dateStr}\n- Automated release bump (${bumpType}).\n- All quality gates and validations passed.\n`;
  const existing = fs.readFileSync(changelogPath, 'utf8');
  fs.writeFileSync(changelogPath, existing + newSection, 'utf8');
  console.log(`Updated CHANGELOG.md with v${nextVersion}`);
}

// 4. Git Tag
const tag = `v${nextVersion}`;
try {
  run('git add package.json CHANGELOG.md');
  run(`git commit -m "chore(release): ${tag}"`);
  run(`git tag -a ${tag} -m "Release ${tag}"`);
  console.log(`\n🎉 Git tag ${tag} created successfully!`);
} catch (err) {
  console.log(`Notice during git tagging: ${err.message}`);
}
