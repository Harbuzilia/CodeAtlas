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

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function getFrontmatterId(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const idMatch = match[1].match(/^id:\s*(.+)$/m);
  return idMatch ? idMatch[1].trim() : null;
}

const registryPath = path.join(root, 'registry.json');
const opencodePath = path.join(root, 'opencode.json');

if (!fs.existsSync(registryPath) || !fs.existsSync(opencodePath)) {
  console.error('FAIL: registry.json or opencode.json missing');
  process.exit(1);
}

const registry = readJson(registryPath);
const opencode = readJson(opencodePath);

const components = [
  ...(registry.components?.agents || []),
  ...(registry.components?.subagents || [])
];

const registryByPath = new Map();
const registryById = new Map();
for (const c of components) {
  registryByPath.set(c.path, c.id);
  registryById.set(c.id, c.path);
}

for (const c of components) {
  const fp = path.join(root, c.path);
  if (!fs.existsSync(fp)) {
    fail(`registry path missing: ${c.path}`);
    continue;
  }

  const fmId = getFrontmatterId(fp);
  if (!fmId) {
    fail(`frontmatter id missing in ${c.path}: expected '${c.id}'`);
    continue;
  }

  if (fmId && fmId !== c.id) {
    fail(`frontmatter id mismatch in ${c.path}: expected '${c.id}', got '${fmId}'`);
  }
}

const opAgents = opencode.agent || {};
for (const [key, cfg] of Object.entries(opAgents)) {
  const p = cfg?.path;
  if (!p) {
    fail(`opencode agent ${key} missing path`);
    continue;
  }

  if (!registryByPath.has(p)) {
    fail(`opencode path not present in registry: ${key} -> ${p}`);
    continue;
  }

  if (!registryById.has(key)) {
    fail(`opencode agent key not present in registry ids: ${key}`);
    continue;
  }

  const registryPath = registryById.get(key);
  if (registryPath !== p) {
    fail(`opencode path mismatch for ${key}: registry '${registryPath}', opencode '${p}'`);
  }
}

const defaultAgent = opencode.default_agent;
if (!defaultAgent) {
  fail('opencode default_agent is missing');
} else if (!registryById.has(defaultAgent)) {
  fail(`default_agent not present in registry: ${defaultAgent}`);
} else if (!opAgents[defaultAgent]) {
  fail(`default_agent not present in opencode.agent map: ${defaultAgent}`);
}

if (hasErrors) {
  console.error('Frontmatter/registry/opencode sync validation failed.');
  process.exit(1);
}

ok('Frontmatter sync validation passed.');
