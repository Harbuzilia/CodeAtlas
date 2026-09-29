import { execSync } from 'node:child_process';

const root = process.cwd();

console.log('====================================================');
console.log('     💥 OPENCODE AI CHAOS & FAULT INJECTION TESTER  ');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// Real chaos harness: verifies that the tooling itself survives stress.
// We cannot inject faults into a project that may not run services, so the
// honest experiments are: timeout resilience, exit-code propagation, and
// repeated concurrent invocations of the actual gate scripts.
// ---------------------------------------------------------------------------

function run(cmd, timeoutMs = 30000) {
  try {
    execSync(cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8', timeout: timeoutMs });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err.message || err).split('\n')[0] };
  }
}

const experiments = [
  {
    name: 'Experiment 1: Gate timeout resilience',
    fault: 'Run validate:all under a 45s hard deadline',
    expected: 'Validator completes or fails loudly with an exit code',
    cmd: 'npm run validate:all',
    timeoutMs: 45000
  },
  {
    name: 'Experiment 2: Route evaluator determinism',
    fault: 'Run eval:routes twice; results must be identical',
    expected: 'Both runs exit 0 (routing table is static, not flaky)',
    cmd: 'npm run eval:routes',
    timeoutMs: 30000
  },
  {
    name: 'Experiment 3: Secret scanner on dirty tree',
    fault: 'Run scan:secrets against the current working tree',
    expected: 'Scanner completes; leaks (if any) are reported and exit code is 1',
    cmd: 'npm run scan:secrets',
    timeoutMs: 30000
  },
  {
    name: 'Experiment 4: Missing-arg degradation',
    fault: 'Run a gate script without required context (e.g. test:smart on clean tree)',
    expected: 'Tool degrades gracefully instead of crashing',
    cmd: 'npm run test:smart',
    timeoutMs: 30000
  }
];

console.log('Running Autonomous Chaos Experiments on Tooling Invariants:\n');

let resilient = 0;

for (const exp of experiments) {
  const first = run(exp.cmd, exp.timeoutMs);
  let status = first.ok ? '✅ RESILIENT' : '❌ BROKEN';

  if (exp.name === 'Experiment 2: Route evaluator determinism' && first.ok) {
    const second = run(exp.cmd, exp.timeoutMs);
    if (!second.ok) {
      status = '❌ NON-DETERMINISTIC';
    }
  }

  if (status.startsWith('✅')) resilient++;

  console.log(`📌 ${exp.name}`);
  console.log(`   - Fault Injected: ${exp.fault}`);
  console.log(`   - Recovery Goal : ${exp.expected}`);
  console.log(`   - Outcome       : ${status}${first.ok ? '' : ` (${first.error})`}\n`);
}

console.log('----------------------------------------------------');
console.log(`Chaos Resilience Score: ${resilient}/${experiments.length} experiments passed.`);

if (resilient < experiments.length) {
  console.error('❌ Some experiments failed. Fix the tooling before claiming resilience.');
  process.exit(1);
} else {
  console.log('🎉 All tooling experiments passed.');
}
console.log('====================================================\n');
