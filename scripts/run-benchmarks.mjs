import { execSync } from 'node:child_process';

const root = process.cwd();

console.log('====================================================');
console.log('     ⏱️ OPENCODE PERFORMANCE & REGRESSION HARNESS   ');
console.log('====================================================\n');

// doc-generator is deliberately NOT benchmarked: it rewrites the committed
// docs/modules/scripts.md as a side effect and dirties the working tree.
const benchmarks = [
  { name: 'Registry Validator', cmd: 'node scripts/validate-registry.mjs' },
  { name: 'Context Refs Validator', cmd: 'node scripts/validate-context-refs.mjs' },
  { name: 'Frontmatter Sync Validator', cmd: 'node scripts/validate-frontmatter-sync.mjs' },
  { name: 'Skills Catalogue Validator', cmd: 'node scripts/validate-skills.mjs' },
  { name: 'Agent Permissions Validator', cmd: 'node scripts/validate-agent-permissions.mjs' },
  { name: 'Runtime Governance Validator', cmd: 'node validate-runtime-governance.mjs' },
  { name: 'Routing Scenario Evaluator (12 routes)', cmd: 'node scripts/eval-scenarios.mjs' },
  { name: 'Security Secret Scanner', cmd: 'node scripts/scan-secrets.mjs' },
  { name: 'Tech Debt Radar', cmd: 'node scripts/tech-debt-radar.mjs' },
  { name: 'AST Impact Blast Radius Radar', cmd: 'node scripts/ast-impact.mjs' },
  { name: 'Test Coverage Gap Analyzer', cmd: 'node scripts/test-coverage-gap.mjs' },
  // audit-deps legitimately runs longer: it walks node_modules and consults the
  // npm metadata, so it gets its own budget instead of tripping the 500ms bar.
  { name: 'Dependency & License Auditor', cmd: 'node scripts/audit-deps.mjs', budget: 2500 },
  { name: 'Token Budget Tracker', cmd: 'node scripts/token-budget-tracker.mjs' }
];

const results = [];

for (const b of benchmarks) {
  const start = performance.now();
  try {
    execSync(b.cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
    const duration = (performance.now() - start).toFixed(2);
    results.push({ name: b.name, duration: `${duration} ms`, status: '✅ PASS', budget: b.budget });
  } catch (err) {
    const duration = (performance.now() - start).toFixed(2);
    results.push({ name: b.name, duration: `${duration} ms`, status: '❌ FAIL' });
  }
}

console.log('📊 Benchmark Results Scorecard:\n');
console.log('| Tool / Validator | Execution Time | Status |');
console.log('| :--- | :--- | :--- |');
for (const r of results) {
  console.log(`| ${r.name.padEnd(42)} | ${r.duration.padStart(10)} | ${r.status} |`);
}

const failed = results.filter((r) => r.status === '❌ FAIL');
const overBudget = results.filter((r) => parseFloat(r.duration) > (r.budget ?? 500));
if (failed.length > 0 || overBudget.length > 0) {
  console.error(
    `⚠️ ${failed.length} tool(s) failed; ${overBudget.length} tool(s) exceeded their time budget. ` +
      'Investigate before claiming performance.'
  );
  process.exitCode = 1;
} else {
  console.log('⚡ All tools completed within their time budget.');
}
