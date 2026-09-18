import fs from 'node:fs';
import path from 'node:path';
import { buildMenu } from './generate-menu.mjs';

const root = process.cwd();
const registryPath = path.join(root, 'registry.json');

let hasErrors = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  hasErrors = true;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

if (!fs.existsSync(registryPath)) {
  console.error('FAIL: registry.json not found');
  process.exit(1);
}

let registry;
try {
  registry = readJson(registryPath);
  ok('registry.json parsed');
} catch (e) {
  console.error(`FAIL: registry.json parse error: ${e.message}`);
  process.exit(1);
}

const components = registry.components || {};
const agents = components.agents || [];
const subagents = components.subagents || [];

const idMap = {
  agent: new Set(agents.map((x) => x.id)),
  subagent: new Set(subagents.map((x) => x.id))
};

const allowedPathPrefixes = ['agents/', '.opencode/agents/'];
const forbiddenLegacyPrefix = '.opencode/agent/';

for (const entry of [...agents, ...subagents]) {
  if (!entry.id) fail('component missing id');
  if (!entry.path) {
    fail(`component ${entry.id || '<unknown>'} missing path`);
    continue;
  }

  const normalizedPath = String(entry.path).replace(/\\/g, '/');
  if (normalizedPath.startsWith(forbiddenLegacyPrefix)) {
    fail(`legacy singular agent path is forbidden for ${entry.id}: ${entry.path}`);
  }
  if (!allowedPathPrefixes.some((prefix) => normalizedPath.startsWith(prefix))) {
    fail(`unsupported registry path layout for ${entry.id}: ${entry.path}`);
  }

  const fp = path.join(root, entry.path);
  if (!fs.existsSync(fp)) {
    fail(`missing path for ${entry.id}: ${entry.path}`);
  }

  const deps = Array.isArray(entry.dependencies) ? entry.dependencies : [];
  for (const dep of deps) {
    const [type, id] = String(dep).split(':');
    if (!type || !id) {
      fail(`invalid dependency format on ${entry.id}: ${dep}`);
      continue;
    }
    if (!idMap[type] || !idMap[type].has(id)) {
      fail(`unresolved dependency on ${entry.id}: ${dep}`);
    }
  }
}

// --- Coherence checks (wave 4) ---------------------------------------------

// 1. Every category used by a component must be defined.
const definedCategories = new Set(Object.keys(registry.categories || {}));
const usedCategories = new Set();
for (const entry of [...agents, ...subagents]) {
  if (entry.category) usedCategories.add(entry.category);
}
for (const cat of usedCategories) {
  if (!definedCategories.has(cat)) {
    fail(`category used but not defined in registry.categories: ${cat}`);
  }
}
if (!hasErrors) ok('Categories coherent');

// 2. Every registry component must exist in opencode.json agent map.
const opencodePath = path.join(root, 'opencode.json');
if (fs.existsSync(opencodePath)) {
  const opencode = readJson(opencodePath);
  const configured = new Set(Object.keys(opencode.agent || {}));
  for (const entry of [...agents, ...subagents]) {
    if (!configured.has(entry.id)) {
      fail(`component ${entry.id} missing from opencode.json agent map`);
    }
  }
  for (const id of configured) {
    if (!idMap.agent.has(id) && !idMap.subagent.has(id)) {
      fail(`opencode.json agent "${id}" missing from registry.json components`);
    }
  }
  if (!hasErrors) ok('registry.json <-> opencode.json coherent');
} else {
  fail('opencode.json not found');
}

// 3. Reachability: every subagent must be referenced by the orchestrator
//    (agents/openagent.md) — otherwise it is dead weight with no route.
const openagentPath = path.join(root, 'agents', 'openagent.md');
if (fs.existsSync(openagentPath)) {
  const openagentText = fs.readFileSync(openagentPath, 'utf8');
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const entry of subagents) {
    if (!new RegExp(`\\b${escapeRegExp(entry.id)}\\b`).test(openagentText)) {
      fail(`subagent ${entry.id} is unreachable: not referenced in agents/openagent.md`);
    }
  }
  if (!hasErrors) ok('All subagents reachable from orchestrator');
} else {
  fail('agents/openagent.md not found');
}

// 4. Menu freshness: command/menu.md must match generated output.
const menuPath = path.join(root, 'command', 'menu.md');
if (fs.existsSync(menuPath)) {
  const actual = fs.readFileSync(menuPath, 'utf8').replace(/\r\n/g, '\n');
  const expected = buildMenu().replace(/\r\n/g, '\n');
  if (actual !== expected) {
    fail('command/menu.md is stale — run: npm run menu:gen');
  } else {
    ok('command/menu.md fresh');
  }
} else {
  fail('command/menu.md not found — run: npm run menu:gen');
}

if (hasErrors) {
  console.error('Registry validation failed.');
  process.exit(1);
}

ok('Registry validation passed.');
