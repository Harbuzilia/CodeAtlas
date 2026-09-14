import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('     🔮 OPENCODE PREDICTIVE DEFECT ORACLE           ');
console.log('====================================================\n');

const ignoreDirs = new Set(['node_modules', '.git', '.tmp', '.opencode', 'dist', 'build', '.githooks', 'skills', 'docs']);
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

console.log(`1. 🧠 Analyzing cognitive complexity, branch density & coupling across ${files.length} source file(s)...\n`);

const risks = [];

for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  // Skip tooling scripts — they are not product code.
  if (rel.startsWith('scripts/') || rel.includes('test') || rel.includes('spec') || rel.includes('validate')) continue;

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/).length;

  // Complexity metrics
  const branchCount = (content.match(/if\s*\(|else|for\s*\(|while\s*\(|switch\s*\(|\?|\&\&|\|\|/g) || []).length;
  const functionCount = (content.match(/function\s+|=>\s*\{|\basync\s+[A-Za-z0-9_]+\s*\(/g) || []).length;
  const anyCount = (content.match(/:\s*any\b/g) || []).length;

  const cognitiveScore = branchCount + (anyCount * 3) + Math.floor(lines / 50);

  // Defect probability is a heuristic estimate, clearly labeled as such.
  const defectProbability = Math.min(95, Math.max(5, (cognitiveScore * 4.5) + (anyCount * 10))).toFixed(1);

  risks.push({
    file: rel,
    complexity: cognitiveScore,
    defectProb: parseFloat(defectProbability),
    anyCount,
    lines
  });
}

risks.sort((a, b) => b.defectProb - a.defectProb);

console.log('📊 Defect Probability & Risk Hotspot Scorecard (heuristic estimate):\n');
console.log('| File Path                                  | Complexity | Defect Risk | Lines |');
console.log('| :----------------------------------------- | :--------- | :---------- | :---- |');

if (risks.length === 0) {
  console.log('| *(No application source files found)*      | Clean (0)  |  0.0%       | 0     |');
} else {
  for (const r of risks.slice(0, 10)) {
    console.log(`| ${r.file.padEnd(42)} | ${r.complexity.toString().padStart(10)} | ${(r.defectProb + '%').padStart(11)} | ${r.lines.toString().padStart(6)} |`);
  }
}

// Flag only files above a real threshold; no fabricated conclusions.
const highRisk = risks.filter((r) => r.defectProb > 50);
const moderateRisk = risks.filter((r) => r.defectProb > 25 && r.defectProb <= 50);

console.log('\n----------------------------------------------------');
console.log(`📋 Findings: ${highRisk.length} HIGH-risk, ${moderateRisk.length} moderate-risk file(s).`);

if (highRisk.length > 0) {
  console.log('⚠️  Recommended: review the files above for boundary checks and null-safety.');
  console.log('   Generate defensive tests with `npm run test:gap` / `/test`.');
  process.exitCode = 1;
} else {
  console.log('✅ No high-risk hotspots above the heuristic threshold.');
}
console.log('====================================================\n');
