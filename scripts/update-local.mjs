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
const files = new Set([
  'opencode.json',
  'registry.json',
  'instructions.md',
  'package.json',
  'validate-runtime-governance.mjs',
  ...(registry.components?.agents || []).map((x) => x.path),
  ...(registry.components?.subagents || []).map((x) => x.path)
]);

let drift = 0;

function sameContent(a, b) {
  return fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8');
}

for (const rel of [...files].sort()) {
  const src = path.join(root, rel);
  const dst = path.join(target, rel);

  if (!fs.existsSync(src)) continue;
  if (!fs.existsSync(dst)) continue; // update existing only

  if (!sameContent(src, dst)) {
    drift += 1;
    if (checkOnly || dryRun) {
      console.log(`DRIFT ${rel}`);
    } else {
      fs.copyFileSync(src, dst);
      console.log(`UPDATED ${rel}`);
    }
  }
}

if (checkOnly && drift > 0) {
  console.error(`Update-check found drift in ${drift} files.`);
  process.exit(1);
}

console.log(checkOnly ? 'Update-local check finished.' : 'Update-local apply finished.');
