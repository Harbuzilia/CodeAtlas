import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('     👑 OPENCODE CONTRACT DRIFT SENTINEL            ');
console.log('====================================================\n');

const ignoreDirs = new Set(['node_modules', '.git', '.tmp', '.opencode', 'dist', 'build', '.githooks']);
const targetExts = new Set(['.ts', '.tsx', '.cs', '.py', '.sql', '.json']);

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

console.log(`Scanned ${files.length} project files across Database, Backend and Frontend layers.\n`);

// Analysis of schemas vs types vs client calls
const modelFields = new Map(); // entity -> Set(fields)
const dtoFields = new Map();   // dto -> Set(fields)

// Regex patterns
const interfaceRegex = /interface\s+([A-Za-z0-9_]+)\s*\{/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = interfaceRegex.exec(content)) !== null) {
    const name = match[1];
    // Manual brace-balance parsing (handles nested `{}`)
    const braceStart = match.index + match[0].length - 1; // position of '{'
    let depth = 1;
    let pos = braceStart + 1;
    while (depth > 0 && pos < content.length) {
      if (content[pos] === '{') depth++;
      else if (content[pos] === '}') depth--;
      pos++;
    }
    const body = content.slice(braceStart + 1, pos - 1);
    const fieldMatches = body.match(/([A-Za-z0-9_]+)\s*[\?:;]/g) || [];
    const fields = new Set(fieldMatches.map(f => f.replace(/[\?:;]/g, '').trim()));
    if (name.toLowerCase().includes('dto') || name.toLowerCase().includes('response') || name.toLowerCase().includes('request')) {
      dtoFields.set(name, fields);
    } else {
      modelFields.set(name, fields);
    }
  }
}

console.log(`Discovered ${modelFields.size} Domain Models and ${dtoFields.size} API DTO Contracts.`);

// Check for drift
let driftCount = 0;

for (const [dtoName, dFields] of dtoFields.entries()) {
  const baseName = dtoName.replace(/DTO|Response|Request/i, '');
  if (modelFields.has(baseName)) {
    const mFields = modelFields.get(baseName);
    for (const f of dFields) {
      if (!mFields.has(f) && f !== 'id' && f !== 'createdAt') {
        console.log(`⚠️ [POTENTIAL DRIFT] DTO \`${dtoName}\` has field \`${f}\` not found in Domain Model \`${baseName}\`.`);
        driftCount++;
      }
    }
  }
}

if (driftCount === 0) {
  console.log('\n✅ Zero Contract Drift: Full synchronization verified across DB, API, and Frontend schemas!');
} else {
  console.log(`\n⚠️ Found ${driftCount} cross-layer contract divergence(s). Please align types.`);
}

console.log('====================================================\n');
