import { execSync } from 'node:child_process';

const root = process.cwd();

console.log('====================================================');
console.log('     🎲 OPENCODE FLAKY-TEST HUNTER (STRESS RUN)     ');
console.log('====================================================\n');

const iterations = 10;
const testCmd = 'node scripts/eval-scenarios.mjs';

console.log(`Running ${iterations} consecutive stress iterations:\n`);

let passedIterations = 0;
const timings = [];
const start = performance.now();

for (let i = 1; i <= iterations; i++) {
  try {
    const iterStart = performance.now();
    execSync(testCmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
    const duration = (performance.now() - iterStart).toFixed(1);
    timings.push(parseFloat(duration));
    console.log(`   [Iteration ${i.toString().padStart(2)}/${iterations}] ✅ PASSED (${duration} ms)`);
    passedIterations++;
  } catch (err) {
    console.error(`   [Iteration ${i.toString().padStart(2)}/${iterations}] ❌ FAILED`);
  }
}

const totalTime = (performance.now() - start).toFixed(1);
const stability = ((passedIterations / iterations) * 100).toFixed(1);
const avgTime = timings.length > 0 ? (timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(1) : 'N/A';
const minTime = timings.length > 0 ? Math.min(...timings).toFixed(1) : 'N/A';
const maxTime = timings.length > 0 ? Math.max(...timings).toFixed(1) : 'N/A';

console.log('\n----------------------------------------------------');
console.log(`📊 Test Determinism Score: ${stability}% (${passedIterations}/${iterations} Runs Deterministic)`);
console.log(`⏱️  Timing: avg=${avgTime}ms, min=${minTime}ms, max=${maxTime}ms, total=${totalTime}ms`);

if (passedIterations === iterations) {
  console.log('🎉 100% Rock-Solid Determinism: Zero flaky test runs detected.');
} else {
  console.error('⚠️ Flakiness detected! Review async event loop handlers.');
  process.exit(1);
}
console.log('====================================================\n');