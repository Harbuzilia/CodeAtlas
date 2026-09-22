import { execSync } from 'node:child_process';

const root = process.cwd();

console.log('====================================================');
console.log('     🤖 OPENCODE PR-REVIEW SCORECARD BOT            ');
console.log('====================================================\n');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' }).trim();
  } catch (err) {
    return null;
  }
}

console.log('1. 🔍 Scanning Pull Request Diff & Branch Topology...');
const branch = run('git rev-parse --abbrev-ref HEAD') || 'main';
console.log(`   - Active Branch: \`${branch}\``);

console.log('\n2. 🛡️ Running Comprehensive Review Suite:');

const checks = [
  { name: 'Governance & Manifests', cmd: 'npm run validate:all' },
  { name: 'Secret Leaks & OWASP Security', cmd: 'npm run scan:secrets' },
  { name: 'Targeted Smart Tests (TIA)', cmd: 'npm run test:smart' },
  { name: 'Cross-Layer Contract Drift', cmd: 'npm run drift' },
  { name: 'Memory & Resource Leaks', cmd: 'npm run perf:leaks' }
];

let allPassed = true;
for (const c of checks) {
  const res = run(c.cmd);
  if (res !== null) {
    console.log(`   ✅ ${c.name.padEnd(32)}: PASS`);
  } else {
    console.error(`   ❌ ${c.name.padEnd(32)}: FAILED`);
    allPassed = false;
  }
}

const riskScore = allPassed ? 0 : 85;

console.log('\n----------------------------------------------------');
console.log('📋 AUTOMATED PULL REQUEST REVIEW SCORECARD:');
console.log(`- PR Health Status : ${allPassed ? '✅ APPROVED' : '❌ CHANGES REQUESTED'}`);
console.log(`- PR Risk Index    : ${riskScore}/100`);
console.log('ℹ️  To create a PR, run `npm run pr` (quality gates + commit + push + gh).');
console.log('====================================================\n');