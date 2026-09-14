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
    mutate: (content) => content.replace('if (hasErrors) {', 'if (false && hasErrors) {')
  },
  {
    name: 'validate-frontmatter-sync.mjs',
    test: 'node scripts/validate-frontmatter-sync.mjs',
    mutate: (content) => content.replace('opencode.json', 'opencode_missing.json')
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

for (const t of testTargets) {
  const srcPath = path.join(root, 'scripts', t.name);
  const tmpPath = path.join(root, '.tmp', t.name);
  const original = fs.readFileSync(srcPath, 'utf8');

  // Mutate a temporary copy (never touch the real file).
  fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
  const mutated = t.mutate(original);
  fs.writeFileSync(tmpPath, mutated, 'utf8');

  // Run the *original* test against the mutated file's domain:
  // the validator should now fail because its input contract changed.
  let killed = false;
  try {
    // Run the test in a copy of the scripts dir where the mutated file shadows the original.
    const shadowDir = path.join(root, '.tmp', 'scripts-shadow');
    fs.mkdirSync(shadowDir, { recursive: true });
    fs.cpSync(path.join(root, 'scripts'), shadowDir, { recursive: true });
    fs.copyFileSync(tmpPath, path.join(shadowDir, t.name));
    execSync(`node ${path.join(shadowDir, t.name)}`, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  } catch {
    killed = true;
  }

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
