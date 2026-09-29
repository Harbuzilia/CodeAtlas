import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('    📦 OPENCODE DEPENDENCY & LICENSE AUDITOR        ');
console.log('====================================================\n');

let issues = 0;

function run(cmd) {
  try {
    return execSync(cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' }).trim();
  } catch (err) {
    return err.stdout || err.stderr || err.message;
  }
}

// ---------------------------------------------------------------------------
// 1. Node.js vulnerability audit (npm audit)
// ---------------------------------------------------------------------------

const pkgPath = path.join(root, 'package.json');

if (fs.existsSync(pkgPath)) {
  console.log('1. Auditing Node.js dependencies (npm audit)...');
  const npmRes = run('npm audit --json');
  try {
    const data = JSON.parse(npmRes);
    const vulns = data.metadata?.vulnerabilities || {};
    const total = (vulns.critical || 0) + (vulns.high || 0) + (vulns.moderate || 0) + (vulns.low || 0);

    if (total === 0) {
      console.log('✅ Node.js: 0 known vulnerabilities found.\n');
    } else {
      console.log(`⚠️ Node.js: Found ${total} vulnerabilities:`);
      console.log(`   - Critical: ${vulns.critical || 0}`);
      console.log(`   - High:     ${vulns.high || 0}`);
      console.log(`   - Moderate: ${vulns.moderate || 0}`);
      console.log(`   - Low:      ${vulns.low || 0}`);
      issues += (vulns.critical || 0) + (vulns.high || 0);
      console.log('');
    }
  } catch (e) {
    console.log('   ℹ️ npm audit returned no parseable data (registry may be unreachable).\n');
  }

  // -------------------------------------------------------------------------
  // 2. License compliance — read real license fields from installed packages.
  // -------------------------------------------------------------------------

  console.log('2. Checking License Compliance...');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  const nodeModules = path.join(root, 'node_modules');

  if (deps.length === 0) {
    console.log('   No runtime dependencies to audit.');
  } else if (!fs.existsSync(nodeModules)) {
    console.log(`   ⚠️ node_modules/ not found — cannot verify licenses for ${deps.length} dependency(ies).`);
    console.log('   Run `npm install` first, then re-run `npm run audit:deps`.');
  } else {
    const problematic = [];
    const permissive = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'Unlicense', 'CC0-1.0']);

    for (const dep of deps) {
      let license = null;
      try {
        const depPkg = JSON.parse(
          fs.readFileSync(path.join(nodeModules, dep, 'package.json'), 'utf8')
        );
        license = typeof depPkg.license === 'string' ? depPkg.license : depPkg.license?.type;
      } catch {
        license = null;
      }

      if (!license) {
        problematic.push({ dep, license: 'UNKNOWN' });
      } else if (!permissive.has(license)) {
        problematic.push({ dep, license });
      }
    }

    if (problematic.length === 0) {
      console.log(`   ✅ ${deps.length} direct dependencies — all permissive licenses (MIT/Apache/BSD).`);
    } else {
      console.log(`   ⚠️ ${problematic.length} direct dependency(ies) need review:`);
      for (const p of problematic) {
        console.log(`      - ${p.dep}: license=${p.license}`);
      }
      console.log('   ℹ️ Non-permissive or unknown licenses may impose legal constraints.');
    }
  }
} else {
  console.log('1. No package.json found — skipping Node dependency audit.');
}

console.log('\nDependency and license audit complete.');
if (issues > 0) {
  console.error('❌ FAILED: high/critical vulnerabilities found. Fix before merging.');
  process.exit(1);
} else {
  console.log('✅ No blocking issues detected.');
}
console.log('====================================================\n');
