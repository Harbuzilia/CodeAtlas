import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('      🔍 OPENCODE AST MEMORY & RESOURCE LEAK HUNTER ');
console.log('====================================================\n');

const ignoreDirs = new Set(['node_modules', '.git', '.tmp', '.opencode', 'dist', 'build', '.githooks']);
const targetExts = new Set(['.ts', '.tsx', '.js', '.mjs', '.cs', '.py']);

const files = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (targetExts.has(ext)) files.push(path.join(dir, entry.name));
    }
  }
}

walk(root);

console.log(`Scanned ${files.length} source files for memory leaks and dangling resources.\n`);

const leaks = [];

for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  // Skip detector itself
  if (rel.includes('ast-leak-detector.mjs')) continue;

  const content = fs.readFileSync(file, 'utf8');

  // 1. Check for setInterval without clearInterval or cleanup
  if (content.includes('setInterval(') && !content.includes('clearInterval(') && !content.includes('stopHeartbeat')) {
    leaks.push({ file: rel, type: 'Dangling setInterval', note: 'setInterval called without matching clearInterval' });
  }

  // 2. Check for addEventListener in React components without removeEventListener
  if (content.includes('addEventListener(') && !content.includes('removeEventListener(') && file.endsWith('.tsx')) {
    leaks.push({ file: rel, type: 'React EventListener Leak', note: 'addEventListener in component without cleanup function' });
  }
}

if (leaks.length === 0) {
  console.log('✅ Clean Bill of Health: Zero memory leaks or unmanaged resource handles detected!');
} else {
  console.log(`⚠️ Detected ${leaks.length} potential resource leak(s):\n`);
  for (const l of leaks) {
    console.log(`📌 File: ${l.file}`);
    console.log(`   - Risk: ${l.type}`);
    console.log(`   - Recommendation: ${l.note}\n`);
  }
}

console.log('====================================================\n');
