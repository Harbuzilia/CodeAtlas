import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);

function getArg(name, fallback = null) {
  const pref = `--${name}=`;
  const found = args.find((a) => a.startsWith(pref));
  return found ? found.slice(pref.length) : fallback;
}

const target = path.resolve(getArg('target', '.tmp/install-smoke'));
const checkOnly = args.includes('--check');
const dryRun = args.includes('--dry-run');

const registry = JSON.parse(fs.readFileSync(path.join(root, 'registry.json'), 'utf8'));

const baseFiles = [
  'opencode.json',
  'registry.json',
  'instructions.md',
  'PROJECT_GUIDE.md',
  'package.json',
  'validate-runtime-governance.mjs',
  'opencode-init.sh'
];

const baseDirs = ['agents', 'context', 'scripts', 'skills', 'skill'];

const files = new Set([
  ...baseFiles,
  ...(registry.components?.agents || []).map((x) => x.path),
  ...(registry.components?.subagents || []).map((x) => x.path)
]);

function collectDirFiles(relDir) {
  const absDir = path.join(root, relDir);
  if (!fs.existsSync(absDir)) return;
  const stack = [absDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absPath);
      } else if (entry.isFile()) {
        files.add(path.relative(root, absPath));
      }
    }
  }
}

for (const d of baseDirs) {
  collectDirFiles(d);
}

let drift = 0;

function sameContent(a, b) {
  return fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8');
}

for (const rel of [...files].sort()) {
  const src = path.join(root, rel);
  const dst = path.join(target, rel);

  if (!fs.existsSync(src)) continue;

  const destinationExists = fs.existsSync(dst);
  const needsUpdate = !destinationExists || !sameContent(src, dst);

  if (!needsUpdate) continue;

  drift += 1;

  if (checkOnly || dryRun) {
    console.log(`DRIFT ${rel}`);
    continue;
  }

  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log(`${destinationExists ? 'UPDATED' : 'CREATED'} ${rel}`);
}

if (checkOnly && drift > 0) {
  console.error(`Update-check found drift in ${drift} files.`);
  process.exit(1);
}

console.log(checkOnly ? 'Update-local check finished.' : 'Update-local apply finished.');
