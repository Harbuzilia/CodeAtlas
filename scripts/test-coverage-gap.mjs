import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('      🧪 OPENCODE TEST COVERAGE GAP ANALYZER        ');
console.log('====================================================\n');

const ignoreDirs = new Set(['node_modules', '.git', '.tmp', '.opencode', 'dist', 'build', '.githooks']);
const targetExts = new Set(['.ts', '.tsx', '.js', '.mjs', '.cs', '.py']);

const sourceFiles = [];
const testFiles = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (targetExts.has(ext)) {
        const full = path.join(dir, entry.name);
        const name = entry.name.toLowerCase();
        if (name.includes('test') || name.includes('spec') || name.includes('validate') || name.includes('eval')) {
          testFiles.push(full);
        } else {
          sourceFiles.push(full);
        }
      }
    }
  }
}

walk(root);

console.log(`Scanned ${sourceFiles.length} source files and ${testFiles.length} test/validation suites.\n`);

const testContents = testFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const gaps = [];

for (const sFile of sourceFiles) {
  const rel = path.relative(root, sFile).replace(/\\/g, '/');
  const content = fs.readFileSync(sFile, 'utf8');
  const symbolRegex = /(?:export\s+(?:function|class|const)\s+|def\s+|public\s+(?:async\s+)?(?:void|[A-Za-z0-9_<>]+)\s+)([A-Za-z0-9_]+)/g;

  let match;
  while ((match = symbolRegex.exec(content)) !== null) {
    const symbol = match[1];
    if (symbol.length < 3 || symbol === 'default') continue;

    const isTested = testContents.includes(symbol);
    if (!isTested) {
      gaps.push({ file: rel, symbol });
    }
  }
}

if (gaps.length === 0) {
  console.log('✅ 100% Symbol Coverage: All exported symbols have corresponding test references!');
} else {
  console.log(`⚠️  Found ${gaps.length} exported symbol(s) with potential test coverage gaps:\n`);
  gaps.slice(0, 10).forEach(g => {
    console.log(`   - [GAP] \`${g.symbol}\` in ${g.file}`);
  });
  if (gaps.length > 10) console.log(`   ... and ${gaps.length - 10} more symbols`);
}

console.log('\n====================================================\n');
