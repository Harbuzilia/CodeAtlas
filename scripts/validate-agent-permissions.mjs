// Guards the agent permission layer — the single tool-restriction mechanism.
//
// Established on opencode 1.18.18 with `opencode debug agent` and confirmed by
// upstream docs:
//   1. The legacy `tools:` map is deprecated; worse, since 1.18.26 a bug
//      (#46873) lets tools-derived rules override user permission rules
//      (last-match-wins). The pack therefore uses `permission:` ONLY — every
//      agent's tools: map was removed; this gate keeps it that way.
//   2. Path globs inside `permission.edit` never matched on 1.18.18 (verified:
//      tools submit worktree-relative paths, and our glob patterns left edit
//      enabled) — such rules are flagged as ineffective.
//   3. Domain actions ("deny" / "allow" / "ask") and per-command bash patterns
//      DO work; subagent delegation is locked via `permission.task: "deny"`
//      on every subagent (openagent keeps the "*" allow).

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const agentsDir = path.join(root, 'agents');

// Permission keys opencode understands. Note there is no `write` permission:
// the `write` tool is governed by `edit` (verified: denying edit also resolves write=false).
const PERMISSION_KEYS = new Set([
  'read', 'edit', 'glob', 'grep', 'list', 'bash', 'task', 'external_directory',
  'todowrite', 'question', 'webfetch', 'websearch', 'lsp', 'doom_loop', 'skill',
]);

let hasErrors = false;

const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  hasErrors = true;
};

const ok = (msg) => console.log(`OK: ${msg}`);

/**
 * Parse the YAML subset used in agent frontmatter: top-level scalars plus up to two
 * levels of nested maps (`permission:` blocks, including second-level
 * pattern maps like `permission.bash."rm -rf *": "ask"`). Keys and values may be
 * quoted (pattern keys contain spaces and `*`). Returns { scalars, maps }.
 */
function parseFrontmatter(text) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const scalars = {};
  const maps = {};
  // Stack of open map blocks: the root receives top-level keys, every key with an
  // empty value opens a nested block. Indentation decides which block a line joins.
  const stack = [{ container: maps, indent: -1 }];
  for (const rawLine of fm[1].split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    const entry = line.trim().match(/^(.+?):\s*(.*)$/);
    if (!entry) continue;
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const container = stack[stack.length - 1].container;
    const key = entry[1].trim().replace(/^["'](.*)["']$/, '$1');
    const value = entry[2].trim().replace(/^["'](.*)["']$/, '$1');
    if (value === '') {
      const block = {};
      container[key] = block;
      stack.push({ container: block, indent });
    } else {
      container[key] = value;
    }
  }
  for (const key of Object.keys(maps)) {
    if (typeof maps[key] !== 'object') {
      scalars[key] = maps[key];
      delete maps[key];
    }
  }
  return { scalars, maps };
}

const files = fs
  .readdirSync(agentsDir)
  .filter((f) => f.endsWith('.md'))
  .sort();

for (const file of files) {
  const name = file.replace(/\.md$/, '');
  const parsed = parseFrontmatter(fs.readFileSync(path.join(agentsDir, file), 'utf8'));
  if (!parsed) {
    fail(`agents/${file}: no YAML frontmatter`);
    continue;
  }
  const { maps } = parsed;
  const tools = maps.tools;
  const permission = maps.permission;

  // Rule 1: the deprecated tools: map must not come back.
  if (tools !== undefined) {
    fail(
      `agents/${file}: deprecated \`tools:\` map present (${Object.keys(tools).length} keys) — opencode ignores ` +
        `it in favour of permission (and 1.18.26+ lets it override user rules, issue #46873). Use \`permission:\` only.`,
    );
  }

  // Rule 2: permission is now the single mechanism — it must exist.
  if (!permission) {
    fail(`agents/${file}: no \`permission:\` block — the only tool-restriction mechanism in this pack`);
    continue;
  }

  for (const key of Object.keys(permission)) {
    if (!PERMISSION_KEYS.has(key)) fail(`agents/${file}: unknown permission key "${key}"`);
  }

  // Rule 3: path globs in permission.edit are silently ignored on 1.18.18 —
  // flag them so the intent is not lost.
  const editRule = permission.edit;
  if (typeof editRule === 'object' && editRule !== undefined) {
    const keys = Object.keys(editRule);
    if (keys.some((k) => k !== '*')) {
      fail(
        `agents/${file}: permission.edit uses path pattern(s) ${JSON.stringify(keys)} — opencode ignores ` +
          `path globs, so this restriction has no effect. Use a domain action ("deny"/"allow"/"ask").`,
      );
    }
  }
}

if (hasErrors) {
  console.error('\nAgent permission validation failed.');
  process.exit(1);
}
ok(`Agent permissions enforced: ${files.length} agents checked (permission-only, no deprecated tools maps)`);
