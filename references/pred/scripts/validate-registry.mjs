import fs from 'node:fs';
import path from 'node:path';

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

for (const entry of [...agents, ...subagents]) {
  if (!entry.id) fail('component missing id');
  if (!entry.path) {
    fail(`component ${entry.id || '<unknown>'} missing path`);
    continue;
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

if (hasErrors) {
  console.error('Registry validation failed.');
  process.exit(1);
}

ok('Registry validation passed.');
