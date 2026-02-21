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
const dryRun = args.includes('--dry-run');
const overwrite = getArg('overwrite', 'skip'); // skip|replace

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

function copyFile(rel) {
  const src = path.join(root, rel);
  const dst = path.join(target, rel);

  if (!fs.existsSync(src)) {
    console.log(`SKIP missing: ${rel}`);
    return;
  }

  fs.mkdirSync(path.dirname(dst), { recursive: true });

  if (fs.existsSync(dst) && overwrite === 'skip') {
    console.log(`SKIP exists: ${rel}`);
    return;
  }

  if (dryRun) {
    console.log(`COPY ${rel}`);
    return;
  }

  fs.copyFileSync(src, dst);
  console.log(`COPIED ${rel}`);
}

console.log(`Target: ${target}`);
console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}, overwrite=${overwrite}`);

for (const rel of [...files].sort()) {
  copyFile(rel);
}

console.log('Install-local finished.');
