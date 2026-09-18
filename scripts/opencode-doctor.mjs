import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('        🩺 OPENCODE AI ENVIRONMENT DOCTOR           ');
console.log('====================================================\n');

let issues = 0;

function check(label, condition, fixMsg = '') {
  if (condition) {
    console.log(`✅ ${label}`);
  } else {
    console.error(`❌ ${label}`);
    if (fixMsg) console.error(`   👉 Fix: ${fixMsg}`);
    issues++;
  }
}

// 1. Check Node.js
const nodeVersion = process.version;
const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
check(`Node.js Runtime (${nodeVersion})`, major >= 18, 'Upgrade Node.js to >= 18.0.0');

// 2. Check Git
try {
  const gitVer = execSync('git --version', { stdio: 'pipe', encoding: 'utf8' }).trim();
  check(`Git CLI (${gitVer})`, true);
} catch (e) {
  check('Git CLI Installed', false, 'Install Git and add it to PATH');
}

// 3. Check opencode.json
const opencodeJsonPath = path.join(root, 'opencode.json');
let opencodeValid = false;
if (fs.existsSync(opencodeJsonPath)) {
  try {
    JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf8'));
    opencodeValid = true;
  } catch (e) {}
}
check('opencode.json JSON Syntax & Structure', opencodeValid, 'Fix JSON syntax in opencode.json');

// 4. Check all agent files exist
const agentFiles = [
  'openagent.md', 'contextscout.md', 'coder.md', 'tester.md',
  'reviewer.md', 'debugger.md', 'planner.md', 'externalscout.md',
  'docwriter.md', 'uitester.md', 'architect.md', 'devops.md'
];
let allAgentsPresent = true;
for (const a of agentFiles) {
  if (!fs.existsSync(path.join(root, 'agents', a))) {
    allAgentsPresent = false;
    break;
  }
}
check(`Agent Manifests (${agentFiles.length}/12 files present in agents/)`, allAgentsPresent, 'Restore missing agent manifests');

// 5. Check navigation.md
const navPath = path.join(root, 'context', 'navigation.md');
check('Context Navigation Index (context/navigation.md)', fs.existsSync(navPath), 'Run `npm run context:index`');

// 6. Check .opencode structure
const opencodeDir = path.join(root, '.opencode');
check('Local .opencode Configuration Directory', fs.existsSync(opencodeDir), 'Run `npm run sync:all` or `.\\opencode-init.ps1`');

// 7. Agent models vs the local provider catalog (WARN only).
// An agent frontmatter model that the project's opencode.json cannot resolve
// kills the whole turn at prompt time ("Model not found") — no silent fallback.
// Catch it here instead, and point at the preset tooling.
if (opencodeValid) {
  try {
    const cfg = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf8'));
    const catalog = new Set();
    for (const [providerId, provider] of Object.entries(cfg.provider || {})) {
      for (const modelId of Object.keys(provider.models || {})) catalog.add(`${providerId}/${modelId}`);
    }
    const unknown = [];
    for (const a of agentFiles) {
      const fm = fs.readFileSync(path.join(root, 'agents', a), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const model = fm ? fm[1].match(/^model:\s*(.+)$/m) : null;
      if (model) {
        const id = model[1].trim().replace(/^["'](.*)["']$/, '$1').replace(/:[^:/]+$/, '');
        if (!catalog.has(id)) unknown.push(`${a.replace('.md', '')} -> ${id}`);
      }
    }
    if (unknown.length === 0) {
      check('Agent models resolvable in local opencode.json catalog', true);
    } else {
      console.log(`⚠️ Agent models missing from the local catalog: ${unknown.join(', ')}`);
      console.log('   A model opencode cannot resolve kills the turn ("Model not found").');
      console.log('   Fix: npm run models:apply -- inherit   (or -- <preset> matching this catalog)');
      issues++;
    }
  } catch {
    // catalog unreadable — skip the warning, validate:all covers syntax
  }
}

console.log('\n----------------------------------------------------');
if (issues === 0) {
  console.log('🎉 All systems are 100% healthy and ready for autonomous agent execution!');
} else {
  console.error(`⚠️ Found ${issues} environment warning(s). Please review the fixes above.`);
}
console.log('====================================================\n');
