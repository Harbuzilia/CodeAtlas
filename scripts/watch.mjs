import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const watchDirs = ['agents', 'command', 'skills', 'context', 'plugin', 'registry.json', 'opencode.json'];

console.log('====================================================');
console.log('   👁  OPENCODE CONFIG WATCH — auto-validate on edit  ');
console.log('====================================================\n');
console.log('Watching:', watchDirs.join(', '));
console.log('On change: npm run validate:all (fast quality gates)');
console.log('Ctrl+C to stop.\n');

let timer = null;
let running = false;
let pending = false;

function validate(reason) {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  const started = Date.now();
  console.log(`\n[${new Date().toLocaleTimeString()}] change: ${reason}`);
  try {
    const out = execSync('npm run validate:all', { cwd: root, encoding: 'utf8', shell: true });
    const okCount = (out.match(/^OK:/gm) || []).length;
    console.log(`✅ validate:all passed (${okCount} OK, ${Date.now() - started} ms)`);
  } catch (err) {
    const out = `${err.stdout || ''}${err.stderr || ''}`;
    const failures = out.split('\n').filter((l) => l.startsWith('FAIL'));
    console.error(`❌ validate:all FAILED (${Date.now() - started} ms)`);
    for (const f of failures.slice(0, 10)) console.error(`   ${f}`);
    console.error('   → fix, or run: npm run heal:config');
  }
  running = false;
  if (pending) {
    pending = false;
    validate('queued change');
  }
}

function onChange(dir) {
  return (event, filename) => {
    if (!filename || filename.includes('agent-journal')) return;
    clearTimeout(timer);
    timer = setTimeout(() => validate(path.join(dir, String(filename))), 400);
  };
}

for (const target of watchDirs) {
  const abs = path.join(root, target);
  if (!fs.existsSync(abs)) continue;
  const isDir = fs.statSync(abs).isDirectory();
  try {
    fs.watch(abs, { recursive: isDir }, onChange(target));
  } catch (err) {
    console.warn(`⚠️ cannot watch ${target}: ${err.message}`);
  }
}

validate('initial run');
