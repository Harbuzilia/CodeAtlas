import { execSync } from 'node:child_process';

const root = process.cwd();

console.log('--- 🩹 Config Heal: regenerate -> sync -> validate ---\n');

const steps = [
  { name: 'Regenerate command/menu.md', cmd: 'node scripts/generate-menu.mjs' },
  { name: 'Regenerate context/navigation.md', cmd: 'node scripts/sync-context-index.mjs' },
  { name: 'Sync .opencode/ and global targets', cmd: 'node scripts/sync-targets.mjs' },
  { name: 'Validate everything', cmd: 'npm run validate:all' }
];

let failed = 0;

for (const step of steps) {
  console.log(`\n== ${step.name} ==`);
  try {
    execSync(step.cmd, { cwd: root, stdio: 'inherit' });
  } catch {
    console.error(`FAIL: ${step.name}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\nHeal finished with ${failed} failed step(s). Fix manually and re-run: npm run heal:config`);
  process.exit(1);
}

console.log('\n🎉 Config fully healed and validated.');
