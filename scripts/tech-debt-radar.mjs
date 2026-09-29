import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('      📡 OPENCODE CODE SMELLS & TECH DEBT RADAR     ');
console.log('====================================================\n');

const ignoreDirs = new Set(['node_modules', '.git', '.tmp', '.opencode', 'dist', 'build', '.githooks']);
const targetExts = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.cs', '.py', '.go', '.rs']);

const filesToScan = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        walk(path.join(dir, entry.name));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (targetExts.has(ext)) {
        filesToScan.push(path.join(dir, entry.name));
      }
    }
  }
}

walk(root);

const warnings = [];
let totalLines = 0;
let totalTodos = 0;

for (const file of filesToScan) {
  const relPath = path.relative(root, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  totalLines += lines.length;

  // 1. Large Files (> 350 lines)
  if (lines.length > 350) {
    warnings.push({
      file: relPath,
      level: 'HIGH',
      issue: `Large file (${lines.length} lines)`,
      recommendation: 'Decompose into smaller modular components/utilities'
    });
  }

  // 2. Deep Nesting & Todos
  let maxIndent = 0;
  let fileTodos = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matchIndent = line.match(/^(\s+)/);
    if (matchIndent) {
      const spaces = matchIndent[1].replace(/\t/g, '    ').length;
      if (spaces > maxIndent) maxIndent = spaces;
    }

    if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(line)) {
      fileTodos++;
      totalTodos++;
    }
  }

  if (maxIndent >= 20) {
    warnings.push({
      file: relPath,
      level: 'MEDIUM',
      issue: `Deep nesting detected (indent ${maxIndent} spaces / 5+ levels)`,
      recommendation: 'Use early returns (guard clauses) or extract nested loops into helper functions'
    });
  }

  if (fileTodos > 3) {
    warnings.push({
      file: relPath,
      level: 'LOW',
      issue: `Multiple unresolved TODOs/FIXMEs (${fileTodos})`,
      recommendation: 'Convert TODOs into formal issues or address in current sprint'
    });
  }
}

console.log(`Scanned ${filesToScan.length} source files (${totalLines} total lines of code).\n`);

if (warnings.length === 0) {
  console.log('✅ Clean Codebase: No significant code smells or structural tech debt detected!');
} else {
  console.log(`⚠️  Detected ${warnings.length} technical debt hotspots:\n`);
  for (const w of warnings) {
    const icon = w.level === 'HIGH' ? '🔴' : w.level === 'MEDIUM' ? '🟡' : '🔵';
    console.log(`${icon} [${w.level}] ${w.file}`);
    console.log(`   - Issue: ${w.issue}`);
    console.log(`   - Fix:   ${w.recommendation}\n`);
  }
}

console.log(`Total Pending TODOs across project: ${totalTodos}`);
console.log('====================================================\n');
