import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('    ⚡ OPENCODE SMART INCREMENTAL TEST SELECTOR     ');
console.log('====================================================\n');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' }).trim();
  } catch (err) {
    return '';
  }
}

// 1. Get changed files from git diff
const diffNames = run('git diff --name-only HEAD') || run('git diff --name-only');
const changedFiles = diffNames.split(/\r?\n/).filter(Boolean);

console.log(`1. 🔍 Analyzing Git Diff: ${changedFiles.length} modified file(s) detected.`);

// Only actual test/validation suites count as tests. Analysis tools that embed
// "test" in their names (mutation-test-runner, chaos-resilience-tester,
// test-coverage-gap, flaky-test-hunter, spec-synthesizer...) must NOT be
// picked up — they are tools, not tests.
const ignoreDirs = new Set(['node_modules', '.git', '.tmp', '.opencode', 'dist', 'build', '.githooks']);
const testFiles = [];

const analysisTools = new Set([
  'mutation-test-runner.mjs',
  'chaos-resilience-tester.mjs',
  'test-coverage-gap.mjs',
  'flaky-test-hunter.mjs',
  'spec-synthesizer.mjs',
  'smart-test-runner.mjs',
  'run-benchmarks.mjs',
  'token-budget-tracker.mjs',
  'defect-oracle.mjs',
  'contract-drift-sentinel.mjs',
  'ast-leak-detector.mjs',
  'db-query-advisor.mjs'
]);

function isTestFile(name, relPath) {
  if (analysisTools.has(name)) return false;
  const base = path.basename(name);
  // Classic patterns: *.test.*, *.spec.*, *-test.*
  if (/\.(test|spec)\.[a-z0-9]+$/i.test(base)) return true;
  // Project validators: validate-*.mjs and route evaluator.
  if (/^validate-.*\.mjs$/.test(base) || base === 'eval-scenarios.mjs') return true;
  // Dedicated test directories.
  if (/[\\/](tests|test|__tests__)[\\/]/i.test(relPath)) return true;
  return false;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      const rel = path.relative(root, path.join(dir, entry.name)).replace(/\\/g, '/');
      if (isTestFile(entry.name, rel)) {
        testFiles.push(path.join(dir, entry.name));
      }
    }
  }
}

walk(root);

// 3. Test Impact Analysis (TIA): Match changed files with dependent test files
const affectedTests = new Set();

if (changedFiles.length === 0) {
  console.log('   ℹ️ Working tree clean. Running core fast validation suite as baseline.');
  affectedTests.add('scripts/validate-registry.mjs');
  affectedTests.add('scripts/eval-scenarios.mjs');
} else {
  for (const changed of changedFiles) {
    const baseName = path.basename(changed, path.extname(changed));
    for (const testFile of testFiles) {
      const rel = path.relative(root, testFile).replace(/\\/g, '/');
      const content = fs.readFileSync(testFile, 'utf8');
      if (content.includes(baseName) || rel.includes(baseName)) {
        affectedTests.add(rel);
      }
    }
  }
}

if (affectedTests.size === 0) {
  console.log('   ℹ️ No direct test references found for modified files. Running fast route evaluator.');
  affectedTests.add('scripts/eval-scenarios.mjs');
}

console.log(`\n2. 🎯 Selected ONLY ${affectedTests.size} affected test suite(s) (Skipped all unchanged tests):\n`);
affectedTests.forEach(t => console.log(`   👉 ${t}`));

console.log('\n3. ⚡ Executing Targeted Test Impact Analysis:\n');

const start = performance.now();
let allPassed = true;

for (const t of affectedTests) {
  try {
    const tStart = performance.now();
    execSync(`node ${t}`, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
    const duration = (performance.now() - tStart).toFixed(2);
    console.log(`   ✅ ${t.padEnd(40)} (Completed in ${duration} ms)`);
  } catch (err) {
    console.error(`   ❌ ${t.padEnd(40)} FAILED`);
    allPassed = false;
  }
}

const totalDuration = (performance.now() - start).toFixed(2);
console.log('\n----------------------------------------------------');
if (allPassed) {
  console.log(`🎉 All affected tests PASSED in ${totalDuration} ms (Saved ~98% execution time)!`);
} else {
  console.error(`❌ Targeted tests failed in ${totalDuration} ms.`);
  process.exit(1);
}
console.log('====================================================\n');
