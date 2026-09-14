import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputArg = process.argv.slice(2).join(' ') || 'User Authentication & RBAC Module';

console.log('====================================================');
console.log('      👑 OPENCODE SPEC-TO-CODE SYNTHESIZER          ');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// 1. Load or synthesize the specification.
// ---------------------------------------------------------------------------

let specTitle = inputArg;
let specContent = '';
let specPath = null;

if (fs.existsSync(path.resolve(root, inputArg))) {
  console.log(`1. 📄 Loading existing specification from: ${inputArg}`);
  specContent = fs.readFileSync(path.resolve(root, inputArg), 'utf8');
  specTitle = path.basename(inputArg, path.extname(inputArg));
  specPath = path.resolve(root, inputArg);
} else {
  console.log(`1. 🧠 No spec file found for "${specTitle}" — writing requirement stub to .opencode/specs/.`);
  specContent = `# Feature Specification: ${specTitle}\n\nGenerated automatically via Spec-to-Code Synthesizer.\n\n## Requirements\n- Modular architecture\n- End-to-end type safety\n- Comprehensive test coverage\n`;
  const specsDir = path.join(root, '.opencode', 'specs');
  fs.mkdirSync(specsDir, { recursive: true });
  specPath = path.join(specsDir, `${specTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md`);
  fs.writeFileSync(specPath, specContent, 'utf8');
  console.log(`   Spec stub written to: ${path.relative(root, specPath)}`);
}

// ---------------------------------------------------------------------------
// 2. Run the REAL gates we can execute locally.
// ---------------------------------------------------------------------------

console.log('\n2. 🩺 Verifying system health before synthesis...');

const gates = [
  { name: 'Registry & Governance', cmd: 'npm run validate:all' },
  { name: 'Routing scenarios', cmd: 'npm run eval:routes' }
];

let allPassed = true;
for (const g of gates) {
  try {
    const { execSync } = await import('node:child_process');
    execSync(g.cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
    console.log(`   ✅ ${g.name}: PASS`);
  } catch (err) {
    console.error(`   ❌ ${g.name}: FAILED — ${String(err.stderr || err.message).split('\n')[0]}`);
    allPassed = false;
  }
}

// ---------------------------------------------------------------------------
// 3. Honest status.
// ---------------------------------------------------------------------------

console.log('\n----------------------------------------------------');
if (allPassed) {
  console.log(`📋 Spec "${specTitle}" is ready for agent-driven implementation.`);
  console.log('   Recommended pipeline: /plan -> architect -> coder -> tester -> devops.');
  console.log('   The synthesizer prepares the spec; agents do the actual implementation.');
} else {
  console.error('❌ Quality gates failed — spec synthesis aborted.');
  console.error('   Fix the reported issues, then re-run `npm run synthesize`.');
}
console.log('====================================================\n');
