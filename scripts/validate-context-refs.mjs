// Validates that every file reference in the prompt corpus actually resolves.
// A previous audit found this gate checked nothing: the corpus contains zero
// `@path.md` refs (the only style it knew), so every link could rot silently.
//
// Three reference styles are checked:
//   1. `@path.md` mentions — resolved relative to the containing file, or to
//      the repo root when the path has no directory part.
//   2. backtick paths with a known repo root (`agents/...`, `context/...`,
//      `command/...`, `skills/...`, `plugin/...`, `docs/...`, `scripts/...`)
//      in agents/, context/ and instructions.md — resolved from the repo root.
//      ADR placeholders (`NNN-title.md`) are naming templates, not references.
//      command/*.md are excluded from this check: their backtick paths usually
//      describe files an agent is instructed to CREATE, not existing refs.
//   3. Markdown links `](target)` — http(s)/mailto/fragment-only targets are
//      skipped; `file:///` absolute and relative targets must exist on disk.
//      This is what makes machine-specific absolute links fail on any other
//      checkout than the machine that generated them.

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let hasErrors = false;
let checked = { at: 0, backtick: 0, link: 0 };

const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  hasErrors = true;
};
const ok = (msg) => console.log(`OK: ${msg}`);

function collectFiles(startPath, out = []) {
  if (!fs.existsSync(startPath)) return out;
  const stat = fs.statSync(startPath);
  if (stat.isFile() && startPath.endsWith('.md')) {
    out.push(startPath);
    return out;
  }
  if (!stat.isDirectory()) return out;

  for (const name of fs.readdirSync(startPath)) {
    collectFiles(path.join(startPath, name), out);
  }
  return out;
}

const mdTargets = [
  path.join(root, 'agents'),
  path.join(root, '.opencode', 'agents'), // backward-compatible optional layout
  path.join(root, 'context'),
  path.join(root, 'command'),
  path.join(root, 'instructions.md'),
  path.join(root, 'PROJECT_GUIDE.md'),
  path.join(root, 'PLANS.md'),
];
const files = mdTargets.flatMap((t) => collectFiles(t));

const backtickTargets = [
  path.join(root, 'agents'),
  path.join(root, '.opencode', 'agents'),
  path.join(root, 'context'),
  path.join(root, 'instructions.md'),
];
const backtickFiles = new Set(backtickTargets.flatMap((t) => collectFiles(t)));

const refRegex = /@([A-Za-z0-9_./-]+\.md)\b/g;
const backtickRegex = /`(agents|context|command|skills|plugin|docs|scripts)\/([A-Za-z0-9_.\/-]+\.(?:md|mjs|js|json))`/g;
const linkRegex = /\]\(([^)\s]+)\)/g;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file).replace(/\\/g, '/');

  let match;
  while ((match = refRegex.exec(text)) !== null) {
    const raw = match[1];
    if (!raw) continue;
    checked.at += 1;

    if (raw.includes('$') || raw.includes('{') || raw.includes('}')) {
      fail(`dynamic @ref in ${rel}: @${raw}`);
      continue;
    }

    if (/^https?:\/\//i.test(raw)) continue;

    const resolved = raw.includes('/')
      ? path.resolve(path.dirname(file), raw)
      : path.resolve(root, raw);

    if (!fs.existsSync(resolved)) {
      fail(`broken @ref in ${rel}: @${raw}`);
    }
  }

  if (backtickFiles.has(file)) {
    while ((match = backtickRegex.exec(text)) !== null) {
      const raw = match[0].slice(1, -1); // strip backticks
      if (raw.includes('NNN')) continue; // ADR naming template, not a file
      checked.backtick += 1;
      const btPath = path.resolve(root, raw);
      if (!fs.existsSync(btPath)) {
        fail(`broken path in ${rel}: \`${raw}\``);
      }
    }
  }

  while ((match = linkRegex.exec(text)) !== null) {
    const target = match[1].split('#')[0];
    if (!target || !target.includes('.')) continue;
    if (/^(https?:|mailto:)/i.test(target)) continue;
    checked.link += 1;

    let resolved;
    if (/^file:\/\//i.test(target)) {
      resolved = target.replace(/^file:\/\/+/i, '');
    } else if (path.isAbsolute(target)) {
      resolved = target;
    } else {
      resolved = path.resolve(path.dirname(file), target);
    }
    if (!fs.existsSync(resolved)) {
      fail(`broken markdown link in ${rel}: ](${target})`);
    }
  }
}

if (hasErrors) {
  console.error('Context reference validation failed.');
  process.exit(1);
}
ok(
  `Context reference validation passed: ${checked.at} @refs, ` +
    `${checked.backtick} backtick paths, ${checked.link} markdown links resolved.`
);
