import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('     🧬 OPENCODE MUTATION TESTING ENGINE            ');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// Real mutation testing: locate the validation scripts, apply a mutation to a
// temporary copy, and check that the corresponding validator FAILS on it.
// A mutation is "killed" when the test suite detects it.
// ---------------------------------------------------------------------------

const testTargets = [
  {
    name: 'validate-registry.mjs',
    test: 'node scripts/validate-registry.mjs',
    mutate: (content) => content.replace('registry.json', 'registry_missing.json')
  },
  {
    name: 'validate-context-refs.mjs',
    test: 'node scripts/validate-context-refs.mjs',
    // Break backtick-path resolution: every path in the clean repo counts as
    // broken, so the validator must fail. (Mutating the @ref branch alone is
    // not killable: the corpus currently contains zero @refs.)
    mutate: (content) => content.replace('if (!fs.existsSync(btPath)) {', "if (!fs.existsSync(btPath + '.nope')) {")
  },
  {
    name: 'validate-frontmatter-sync.mjs',
    test: 'node scripts/validate-frontmatter-sync.mjs',
    mutate: (content) => content.replace('opencode.json', 'opencode_missing.json')
  },
  {
    name: 'validate-skills.mjs',
    test: 'node scripts/validate-skills.mjs',
    mutate: (content) => content.replace("path.join(root, 'skills')", "path.join(root, 'skills_missing')")
  },
  {
    name: 'validate-agent-permissions.mjs',
    test: 'node scripts/validate-agent-permissions.mjs',
    mutate: (content) => content.replace("path.join(root, 'agents')", "path.join(root, 'agents_missing')")
  },
  {
    name: 'validate-docs-sync.mjs',
    test: 'node scripts/validate-docs-sync.mjs',
    // Invert the skill-count comparison: the declared number no longer has to
    // match disk, so drift goes undetected — unless the baseline fails.
    mutate: (content) =>
      content.replace('Number(skillCountPlans[1]) !== skills.length', 'Number(skillCountPlans[1]) === skills.length')
  }
];

console.log('1. 🔍 Baseline Check: Running test suite against clean codebase...');
let baselineOk = true;
for (const t of testTargets) {
  try {
    execSync(t.test, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  } catch {
    baselineOk = false;
    console.error(`   ❌ Baseline failed for ${t.name}. Code must pass before mutation testing.`);
  }
}
if (!baselineOk) {
  process.exit(1);
}
console.log('   ✅ Baseline: all validators passing.\n');

console.log('2. 🧬 Injecting AST Mutations & Measuring Mutant Kill Rate:\n');

let killedCount = 0;

// Rebuild the shadow from the live scripts/ on every run: files deleted or renamed
// since the previous run must not linger (cpSync only overwrites, never prunes).
const shadowDir = path.join(root, '.tmp', 'scripts-shadow');
fs.rmSync(shadowDir, { recursive: true, force: true });
fs.cpSync(path.join(root, 'scripts'), shadowDir, { recursive: true });

for (const t of testTargets) {
  const srcPath = path.join(root, 'scripts', t.name);
  const shadowPath = path.join(shadowDir, t.name);
  const original = fs.readFileSync(srcPath, 'utf8');

  // Mutate the shadow copy only (never the real file).
  const mutated = t.mutate(original);
  if (mutated === original) {
    // The anchor string no longer exists — the mutation silently doesn't apply and
    // would show up as a false "SURVIVED". Fail loudly instead.
    console.error(`📌 Mutant: ${t.name}`);
    console.error(`   - Mutation: DID NOT APPLY (anchor string not found in ${t.name}). Update the mutation.`);
    process.exitCode = 1;
    console.error('');
    continue;
  }
  fs.writeFileSync(shadowPath, mutated, 'utf8');

  // Run the mutated validator against the real codebase: it should now fail
  // because its input contract changed or its guard was disabled.
  let killed = false;
  try {
    execSync(`node ${shadowPath}`, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  } catch {
    killed = true;
  }
  // Restore the pristine copy so the next mutant starts from a clean shadow.
  fs.copyFileSync(srcPath, shadowPath);

  console.log(`📌 Mutant: ${t.name}`);
  console.log(`   - Mutation: contract input renamed / guard disabled`);
  console.log(`   - Test Reaction: ${killed ? '🩸 KILLED (test suite caught the mutation)' : '⚠️ SURVIVED (tests failed to catch the bug)'}`);
  killedCount += killed ? 1 : 0;
  console.log('');
}

const score = ((killedCount / testTargets.length) * 100).toFixed(1);

console.log('----------------------------------------------------');
console.log(`📊 Mutation Score: ${score}% (${killedCount}/${testTargets.length} Mutants Killed)`);
if (killedCount === testTargets.length) {
  console.log('🏆 All mutants killed — validators detect injected faults.');
} else {
  console.error('⚠️ Some mutants survived. Strengthen the affected validators.');
  process.exitCode = 1;
}
console.log('====================================================\n');
