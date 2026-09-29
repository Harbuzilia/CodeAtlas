import { execSync } from 'node:child_process';

const root = process.cwd();

console.log('====================================================');
console.log('        🚀 OPENCODE1 ONBOARDING (one command)        ');
console.log('====================================================\n');

let failed = 0;

function step(name, fn) {
  process.stdout.write(`▶ ${name} ... `);
  try {
    const detail = fn();
    console.log(`OK${detail ? ` (${detail})` : ''}`);
  } catch (err) {
    console.log('FAIL');
    console.error(`  ${String(err.message || err).split('\n')[0]}`);
    failed++;
  }
}

function cmd(command) {
  execSync(command, { cwd: root, stdio: 'pipe', encoding: 'utf8', shell: true });
}

// 1. Environment prerequisites
step('Node.js >= 18', () => {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 18) throw new Error(`node ${process.versions.node} too old`);
  return `v${process.versions.node}`;
});

step('Git CLI', () => cmd('git --version'));

step('OpenCode CLI', () => cmd('opencode --version'));

// 2. Git hooks
step('Git hooks (core.hooksPath)', () => cmd('node scripts/setup-hooks.mjs'));

// 3. Heal + sync configs (menu, navigation, .opencode copies, validation)
step('Config heal & sync', () => cmd('node scripts/heal-config.mjs'));

// 4. Full diagnostics
step('Environment doctor', () => cmd('node scripts/opencode-doctor.mjs'));

console.log('\n====================================================');
if (failed > 0) {
  console.error(`❌ Onboarding finished with ${failed} failed step(s). Fix and re-run: npm run onboard`);
  process.exit(1);
}

console.log('🎉 System ready. Next steps:');
console.log('  - opencode                 # start a session (agent: openagent)');
console.log('  - /menu                    # capability map inside a session');
console.log('  - npm run eval:routes      # routing conformance (24 scenarios)');
console.log('  - npm run telemetry        # routing analytics from real usage');
console.log('====================================================\n');
