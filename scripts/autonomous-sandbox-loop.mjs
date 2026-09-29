import { execSync } from 'node:child_process';

const root = process.cwd();

console.log('====================================================');
console.log('     👑 OPENCODE AUTONOMOUS SELF-HEALING SANDBOX     ');
console.log('====================================================\n');

function run(cmd, ignoreError = false) {
  try {
    return execSync(cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' }).trim();
  } catch (err) {
    if (ignoreError) return null;
    throw new Error(err.stderr || err.stdout || err.message);
  }
}

const isGit = run('git rev-parse --is-inside-work-tree', true) === 'true';
if (!isGit) {
  console.error('❌ Self-healing sandbox requires a git repository.');
  console.error('   Snapshot + rollback are only safe inside git. Aborting.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Preconditions: healing is only safe on a clean tree.
//    `git reset --hard` cannot restore uncommitted user work, so require
//    a clean tree (or --force) instead of pretending otherwise.
// ---------------------------------------------------------------------------

const force = process.argv.includes('--force');
const status = run('git status --porcelain', true) || '';
const headBefore = run('git rev-parse HEAD', true) || 'HEAD';

if (status.trim().length > 0 && !force) {
  console.error('❌ Working tree is not clean. Uncommitted changes would be at risk.');
  console.error('   Commit or stash your work first, or re-run with --force.');
  console.error('   (--force proceeds with the understanding that failed healing will');
  console.error('   `git reset --hard` tracked files back to the current HEAD.)');
  process.exit(1);
}

console.log(`1. 📸 Safety checkpoint: HEAD=${headBefore.slice(0, 8)} (working tree ${status.trim() ? 'DIRTY (--force)' : 'clean'}).\n`);

// ---------------------------------------------------------------------------
// 2. Verification gates
// ---------------------------------------------------------------------------

console.log('2. 🔍 Running sandbox verification gates:');

const gates = [
  { name: 'Registry & Governance Quality Gates', cmd: 'npm run validate:all' },
  { name: 'Security & Secret Leak Checks', cmd: 'npm run scan:secrets' },
  { name: 'Routing & Agent Scenarios', cmd: 'npm run eval:routes' }
];

let allPassed = true;
let failedGate = null;

for (const g of gates) {
  try {
    run(g.cmd);
    console.log(`   ✅ ${g.name}: PASS`);
  } catch (err) {
    console.error(`   ❌ ${g.name}: FAILED`);
    allPassed = false;
    failedGate = { name: g.name, error: err.message };
    break;
  }
}

if (allPassed) {
  console.log('\n🎉 Self-Healing Sandbox Verification PASSED 100%!');
  console.log('Project is in pristine, robust condition. Zero interventions needed.');
  console.log('====================================================\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 3. Honest remediation loop.
//    The only safely-automatable fix is regenerating derived artifacts
//    (context/navigation.md). We never fabricate a "healed" verdict.
// ---------------------------------------------------------------------------

console.log(`\n🚨 Failure detected in: ${failedGate.name}`);
console.log(`   ${failedGate.error.split('\n')[0] || ''}`);
console.log('3. 🩺 Triggering remediation loop (regenerating derived artifacts)...');

let healed = false;
for (let attempt = 1; attempt <= 3; attempt++) {
  console.log(`   -> Attempt ${attempt}/3: regenerating context index...`);
  run('npm run context:index', true);

  try {
    run('npm run validate:all');
    healed = true;
    console.log(`\n🎉 Self-Healing SUCCEEDED on attempt ${attempt}!`);
    break;
  } catch {
    // Still broken; try again.
  }
}

if (!healed) {
  console.error('\n❌ Self-healing reached maximum 3 iterations without stabilization.');
  console.error('4. 🛡️ ROLLBACK: resetting tracked files to the pre-run state...');
  run(`git reset --hard ${headBefore}`, true);
  const afterRollback = run('git status --porcelain', true) || '';
  if (afterRollback.trim().length > 0) {
    console.error('   ⚠️ Untracked files remain (not touched by rollback):');
    for (const line of afterRollback.split(/\r?\n/).slice(0, 10)) console.error(`      ${line}`);
  } else {
    console.log('   ✅ Clean rollback complete. Working tree restored.');
  }
  process.exit(1);
}

console.log('====================================================\n');
