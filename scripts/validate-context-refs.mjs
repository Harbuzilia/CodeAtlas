import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let hasErrors = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  hasErrors = true;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function collectFiles(startPath, out = []) {
  if (!fs.existsSync(startPath)) return out;
  const stat = fs.statSync(startPath);
  if (stat.isFile() && startPath.endsWith('.md')) {
    out.push(startPath);
    return out;
  }
  if (!stat.isDirectory()) return out;

  for (const name of fs.readdirSync(startPath)) {
    const fp = path.join(startPath, name);
    const rel = path.relative(root, fp).replace(/\\/g, '/');
    if (rel.startsWith('references/')) continue;
    if (rel.startsWith('docs/legacy/history/')) continue;
    collectFiles(fp, out);
  }
  return out;
}

const targets = [
  path.join(root, 'agents'),
  path.join(root, '.opencode', 'agents'), // backward-compatible optional layout
  path.join(root, 'context'),
  path.join(root, 'instructions.md')
];

const files = targets.flatMap((t) => collectFiles(t));
const refRegex = /@([A-Za-z0-9_./-]+\.md)\b/g;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = refRegex.exec(text)) !== null) {
    const raw = match[1];
    if (!raw) continue;

    if (raw.includes('$') || raw.includes('{') || raw.includes('}')) {
      fail(`dynamic @ref in ${path.relative(root, file)}: @${raw}`);
      continue;
    }

    if (/^https?:\/\//i.test(raw)) continue;

    const resolved = raw.includes('/')
      ? path.resolve(path.dirname(file), raw)
      : path.resolve(root, raw);

    if (!fs.existsSync(resolved)) {
      fail(`broken @ref in ${path.relative(root, file)}: @${raw}`);
    }
  }
}

if (hasErrors) {
  console.error('Context reference validation failed.');
  process.exit(1);
}

ok('Context reference validation passed.');
