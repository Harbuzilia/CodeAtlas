// Guards a class of defect that was invisible until it was measured against the
// real runtime: an agent's declared restrictions were not enforced at all.
//
// Established on opencode 1.18.18 with `opencode debug agent <name>`:
//   1. As soon as an agent has a `permission:` block, its `tools:` map is ignored
//      and every tool is enabled again (e.g. coder resolved task=true while its
//      own frontmatter said `task: false`).
//   2. Path globs inside `permission` never match: `"**/*": "deny"`, `"**": "deny"`,
//      `"*.md": "deny"` and `"docs/adr/**": "allow"` all left the tool enabled.
//      Only a domain-level action (`"deny"`, or `{"*": "deny"}`) is enforced.
//   3. `tools: X: false` is honoured only while no `permission:` block exists.
//
// Therefore: every tool an agent declares as `false` must ALSO be denied in
// `permission`, and `edit`/`write` must never be expressed as a path glob.

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const agentsDir = path.join(root, 'agents');

const KNOWN_TOOLS = new Set([
  'read', 'edit', 'write', 'bash', 'grep', 'glob', 'list', 'task', 'skill',
  'todowrite', 'todoread', 'question', 'patch', 'webfetch', 'websearch', 'lsp',
]);

// Permission keys opencode understands. Note there is no `write` permission:
// the `write` tool is governed by `edit` (verified: denying edit also resolves write=false).
const PERMISSION_KEYS = new Set([
  'read', 'edit', 'glob', 'grep', 'list', 'bash', 'task', 'external_directory',
  'todowrite', 'question', 'webfetch', 'websearch', 'lsp', 'doom_loop', 'skill',
]);

// Tool -> the permission that actually governs it. `null` = no permission analog.
const TOOL_PERMISSION = {
  write: 'edit',
  todoread: null,
};

let hasErrors = false;

const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  hasErrors = true;
};
const ok = (msg) => console.log(`OK: ${msg}`);

/**
 * Parse the YAML subset used in agent frontmatter: top-level scalars plus up to two
 * levels of nested maps (`tools:` / `permission:` blocks, including second-level
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

  for (const key of Object.keys(tools || {})) {
    if (!KNOWN_TOOLS.has(key)) fail(`agents/${file}: unknown tool "${key}" in tools:`);
  }
  for (const key of Object.keys(permission || {})) {
    if (!PERMISSION_KEYS.has(key)) fail(`agents/${file}: unknown permission key "${key}"`);
  }

  // Rule 1 + 3: a declared `false` must survive the presence of a permission block.
  const declaredOff = Object.entries(tools || {})
    .filter(([, v]) => v === 'false')
    .map(([k]) => k);

  for (const tool of declaredOff) {
    if (!permission) continue; // tools alone are honoured in this case
    const permKey = tool in TOOL_PERMISSION ? TOOL_PERMISSION[tool] : tool;
    if (permKey === null) continue; // no permission analog exists
    const value = permission[permKey];
    // A tool is denied only by a domain action: "deny" or {"*": "deny"}. A pattern
    // map (e.g. bash: { "npm *": "allow", "*": "ask" }) leaves the tool ENABLED.
    const denied = value === 'deny' || (typeof value === 'object' && value['*'] === 'deny');
    if (!denied) {
      fail(
        `agents/${file}: tools.${tool}=false is NOT enforced — a permission: block exists but never denies ` +
          `"${permKey}" (opencode 1.18.18 ignores the tools map in that case). Add permission.${permKey}: "deny".`,
      );
    }
  }

  // Rule 2: path globs in edit are silently ignored — flag them so intent is not lost.
  const editRule = permission?.edit;
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
ok(`Agent permissions enforced: ${files.length} agents checked (tools:false mirrored by permission deny)`);
