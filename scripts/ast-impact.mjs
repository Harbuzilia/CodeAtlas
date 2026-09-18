import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('      🎯 OPENCODE AST IMPACT & BLAST RADIUS RADAR   ');
console.log('====================================================\n');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' }).trim();
  } catch (err) {
    return '';
  }
}

// 1. Get modified lines in git diff
const diff = run('git diff HEAD') || run('git diff');

if (!diff) {
  console.log('ℹ️ Working tree clean. No uncommitted changes to analyze for impact blast radius.');
  console.log('Tip: Make changes to a function or class and run `npm run impact`.\n');
  process.exit(0);
}

// 2. Extract modified function/class names
const symbolRegex = /(?:export\s+(?:function|class|interface|type|const)|def\s+|public\s+(?:async\s+)?(?:class|interface|void|[A-Za-z0-9_<>]+)\s+)([A-Za-z0-9_]+)/g;
const modifiedSymbols = new Set();

let match;
while ((match = symbolRegex.exec(diff)) !== null) {
  if (match[1] && match[1].length > 2) {
    modifiedSymbols.add(match[1]);
  }
}

console.log(`1. Extracted ${modifiedSymbols.size} modified symbol(s) from git diff:`);
modifiedSymbols.forEach(s => console.log(`   - ${s}`));
console.log('');

// 3. Search references across codebase
const ignoreDirs = new Set(['node_modules', '.git', '.tmp', '.opencode', 'dist', 'build', '.githooks']);
const targetExts = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.cs', '.py', '.go', '.rs']);

const filesToSearch = [];
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (targetExts.has(ext)) filesToSearch.push(path.join(dir, entry.name));
    }
  }
}
walk(root);

console.log('2. Impact Blast Radius Analysis:');

let totalImpactedFiles = new Set();

for (const sym of modifiedSymbols) {
  const callers = [];
  const symRegex = new RegExp(`\\b${sym}\\b`);

  for (const file of filesToSearch) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    if (symRegex.test(content)) {
      callers.push(rel);
      totalImpactedFiles.add(rel);
    }
  }

  console.log(`\n📌 Symbol: \`${sym}\` -> Used in ${callers.length} file(s):`);
  callers.slice(0, 5).forEach(c => console.log(`   - ${c}`));
  if (callers.length > 5) console.log(`   ... and ${callers.length - 5} more files`);
}

console.log(`\n📊 Total Impact Blast Radius: ${totalImpactedFiles.size} dependent file(s).`);
console.log('====================================================\n');
