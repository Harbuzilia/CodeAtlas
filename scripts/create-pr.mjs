import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('--- 🚀 OpenCode Automated PR & Push Pipeline ---\n');

function run(cmd, ignoreError = false) {
  try {
    return execSync(cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' }).trim();
  } catch (err) {
    if (ignoreError) return null;
    throw new Error(`Command failed: ${cmd}\n${err.stderr || err.message}`);
  }
}

// 1. Quality Gates
console.log('1. Validating Quality Gates (npm run validate:all)...');
try {
  run('npm run validate:all');
  console.log('✅ Quality Gates passed.\n');
} catch (err) {
  console.error('❌ Quality Gates validation failed:');
  console.error(err.message);
  process.exit(1);
}

// 2. Check Git Status
const status = run('git status --porcelain');
const currentBranch = run('git rev-parse --abbrev-ref HEAD');

console.log(`2. Current Branch: ${currentBranch}`);

if (status) {
  console.log('3. Staging and committing changes...');
  run('git add .');
  const commitMsg = process.argv.slice(2).join(' ') || 'chore: automated agent update and enhancements';
  run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
  console.log(`✅ Committed: "${commitMsg}"\n`);
} else {
  console.log('3. Working tree clean. Proceeding to push/PR checks...\n');
}

// 3.5 Duplicate-PR Guard (squash-merge safe)
// После squash-merge локальные коммиты остаются "ahead" по истории, хотя контент
// уже в main. "Commits ahead" != есть изменения — проверяем КОНТЕНТНЫЙ diff.
if (currentBranch !== 'main' && currentBranch !== 'master') {
  console.log('3.5 Duplicate-PR guard: проверка, что изменения ещё не в origin/main...');
  run('git fetch origin --prune', true);
  const remoteInfo = run('git remote show origin', true);
  const defaultBranch = remoteInfo?.match(/HEAD branch: (\S+)/)?.[1] || 'main';

  const contentDiff = run(`git diff --name-only origin/${defaultBranch}..HEAD`, true);
  if (contentDiff === '') {
    console.log(`ℹ️  Контент ветки ${currentBranch} уже полностью в origin/${defaultBranch} (вероятно, squash-merge).`);
    const existing = run(`gh pr list --head ${currentBranch} --state all --json number,state --limit 5`, true);
    if (existing) console.log(`   Существующие PR для ветки: ${existing}`);
    console.log('   PR НЕ создаём. Удаляю бесполезную ветку...');
    run(`git checkout ${defaultBranch}`, true);
    run(`git branch -D ${currentBranch}`, true);
    run(`git push origin --delete ${currentBranch}`, true);
    console.log('✅ Ветка удалена (local + remote). Pipeline завершён без PR.\n');
    process.exit(0);
  }

  if (ghAvailable()) {
    const openPr = run(`gh pr list --head ${currentBranch} --state open --json number,title --limit 1`, true);
    if (openPr && openPr !== '[]') {
      console.log(`ℹ️  Открытый PR для ${currentBranch} уже существует: ${openPr}`);
      console.log('   Пропускаю создание дубликата. Pipeline завершён.\n');
      process.exit(0);
    }
  }
  console.log('✅ Guard passed: есть реальный diff, открытых PR нет.\n');
}

function ghAvailable() {
  return run('gh --version', true) !== null;
}

// 4. Push
console.log(`4. Pushing branch ${currentBranch} to origin...`);
const pushRes = run(`git push -u origin ${currentBranch}`, true);
if (pushRes !== null) {
  console.log(`✅ Pushed to origin/${currentBranch}\n`);
} else {
  console.log(`ℹ️ Remote push skipped or origin not configured.\n`);
}

// 5. Create PR via GitHub CLI if available
console.log('5. Checking GitHub CLI (gh)...');
const ghVersion = ghAvailable() ? run('gh --version', true) : null;

if (ghVersion) {
  console.log('Found gh CLI. Attempting to create PR...');
  const prTitle = process.argv.slice(2).join(' ') || `Update from ${currentBranch}`;
  const prBody = `## 🚀 Automated Agent PR\n\n### Summary\nAutomated updates, quality gate verification, and enhancements.\n\n### Quality Gates\n- [x] npm run validate:all passed\n- [x] No breaking governance drift\n`;
  try {
    const prUrl = run(`gh pr create --title "${prTitle}" --body "${prBody}"`);
    console.log(`\n🎉 PR Created successfully: ${prUrl}`);
  } catch (err) {
    console.log(`Notice: Could not automatically create PR via gh (may already exist or need interactive auth): ${err.message}`);
  }
} else {
  console.log('GitHub CLI (gh) not installed. PR pipeline finished local commit & push steps.');
}
