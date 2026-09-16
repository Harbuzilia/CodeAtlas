// Sync source-of-truth dirs at the repo root into the local `.opencode/` runtime dir.
//
// WHY: opencode loads project skills, commands and plugins from `.opencode/` only
// (`.opencode/skills/`, `.opencode/command/`, `.opencode/plugin/`). The repo keeps the
// editable master copies at the root (agents/, command/, skills/, context/, plugin/),
// so `.opencode/` is a BUILD OUTPUT, not a source. It is gitignored on purpose.
//
// This script mirrors root -> .opencode/ so the runtime can never go stale.
//
// Usage:
//   node scripts/sync-local.mjs           # mirror (default)
//   node scripts/sync-local.mjs --check   # report drift, exit 1 if any (for CI)

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checkOnly = process.argv.includes('--check');
const runtimeDir = path.join(root, '.opencode');

// Mirrored 1:1 from repo root into .opencode/<dir>.
const MIRRORED_DIRS = ['agents', 'command', 'context', 'plugin', 'skills'];

/** Recursively list files (posix-style relative paths) under `dir`. */
function listFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (entry.isFile()) out.push(path.relative(dir, abs).split(path.sep).join('/'));
    }
  }
  return out.sort();
}

/** Describe how `dest` differs from `src`. Returns array of human-readable issues. */
function diffDirs(src, dest, label) {
  const issues = [];
  if (!fs.existsSync(dest)) return [`${label}: missing entirely`];
  const srcFiles = listFiles(src);
  const destFiles = new Set(listFiles(dest));
  for (const rel of srcFiles) {
    if (!destFiles.has(rel)) {
      issues.push(`${label}/${rel}: missing`);
      continue;
    }
    const a = fs.readFileSync(path.join(src, rel));
    const b = fs.readFileSync(path.join(dest, rel));
    if (!a.equals(b)) issues.push(`${label}/${rel}: differs`);
    destFiles.delete(rel);
  }
  for (const rel of destFiles) issues.push(`${label}/${rel}: stale (not in source)`);
  return issues;
}

function mirrorDir(src, dest) {
  // Replace wholesale so deleted sources do not linger as stale runtime files.
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

const issues = [];
let mirrored = 0;

for (const dir of MIRRORED_DIRS) {
  const src = path.join(root, dir);
  const dest = path.join(runtimeDir, dir);
  if (!fs.existsSync(src)) continue;

  if (checkOnly) {
    issues.push(...diffDirs(src, dest, dir));
  } else {
    mirrorDir(src, dest);
    mirrored++;
  }
}

// The runtime needs its own package.json: plugins are ESM ("type": "module") and
// validate-runtime-governance.mjs verifies the @opencode-ai/plugin version against it.
// Nothing else creates this file, so a fresh clone without this step crashes CI.
function buildRuntimePackage() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return JSON.stringify(
    {
      name: 'opencode-runtime',
      private: true,
      type: 'module',
      dependencies: { '@opencode-ai/plugin': pkg.dependencies?.['@opencode-ai/plugin'] ?? 'latest' },
    },
    null,
    2,
  ) + '\n';
}

const runtimePkgPath = path.join(runtimeDir, 'package.json');
if (checkOnly) {
  const expected = buildRuntimePackage();
  if (!fs.existsSync(runtimePkgPath)) {
    issues.push('.opencode/package.json: missing (generated from root package.json)');
  } else if (fs.readFileSync(runtimePkgPath, 'utf8') !== expected) {
    issues.push('.opencode/package.json: differs from root package.json');
  }
} else {
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(runtimePkgPath, buildRuntimePackage(), 'utf8');
}

if (checkOnly) {
  if (issues.length === 0) {
    console.log(`OK: .opencode/ runtime is in sync with source (${MIRRORED_DIRS.length} dirs + package.json).`);
    process.exit(0);
  }
  console.error(`FAIL: .opencode/ runtime is stale — ${issues.length} difference(s):`);
  for (const issue of issues.slice(0, 40)) console.error(`  - ${issue}`);
  if (issues.length > 40) console.error(`  ... and ${issues.length - 40} more`);
  console.error('Run: npm run sync:local');
  process.exit(1);
}

console.log(`OK: mirrored ${mirrored} dirs from repo root into .opencode/ runtime + generated package.json.`);
