import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('      🔍 OPENCODE SQL QUERY & INDEX ADVISOR         ');
console.log('====================================================\n');

const ignoreDirs = new Set(['node_modules', '.git', '.tmp', '.opencode', 'dist', 'build', '.githooks']);
const targetExts = new Set(['.sql', '.ts', '.js', '.cs', '.py']);

const sqlQueries = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (targetExts.has(ext)) {
        const full = path.join(dir, entry.name);
        const content = fs.readFileSync(full, 'utf8');
        const queryRegex = /(?:SELECT|UPDATE|DELETE)\s+[\s\S]*?\s+FROM\s+([A-Za-z0-9_]+)\s+WHERE\s+([^;\n]+)/gi;
        let match;
        while ((match = queryRegex.exec(content)) !== null) {
          sqlQueries.push({
            file: path.relative(root, full).replace(/\\/g, '/'),
            table: match[1],
            whereClause: match[2].trim()
          });
        }
      }
    }
  }
}

walk(root);

console.log(`Scanned project files. Found ${sqlQueries.length} SQL/ORM query pattern(s).\n`);

const suggestions = [];

for (const q of sqlQueries) {
  const colMatch = q.whereClause.match(/([A-Za-z0-9_]+)\s*(?:=|<|>|IN|LIKE)/i);
  if (colMatch && colMatch[1] && colMatch[1].toLowerCase() !== 'true') {
    const col = colMatch[1];
    // Primary keys and universally-indexed columns are already covered.
    if (['id', 'guid', 'uuid'].includes(col.toLowerCase())) continue;
    suggestions.push({
      table: q.table,
      column: col,
      file: q.file,
      ddl: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${q.table.toLowerCase()}_${col.toLowerCase()} ON ${q.table} (${col});`
    });
  }
}

if (suggestions.length === 0) {
  console.log('✅ No slow query antipatterns detected. All database queries appear cleanly structured.');
} else {
  console.log('💡 Recommended Index Optimizations:\n');
  const seen = new Set();
  for (const s of suggestions) {
    const key = `${s.table}:${s.column}`;
    if (!seen.has(key)) {
      seen.add(key);
      console.log(`📌 Table: \`${s.table}\` | Filter Column: \`${s.column}\` (from ${s.file})`);
      console.log(`   👉 DDL: ${s.ddl}\n`);
    }
  }
}

console.log('====================================================\n');
