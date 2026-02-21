import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const smokeMode = process.argv.includes('--smoke');
const opencodePath = path.join(root, 'opencode.json');
const pathsPath = path.join(root, 'context', 'core', 'config', 'paths.json');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`OK: ${message}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

if (!fs.existsSync(opencodePath)) {
  fail('opencode.json not found');
  process.exit(1);
}

if (!fs.existsSync(pathsPath)) {
  fail('context/core/config/paths.json not found');
  process.exit(1);
}

const opencode = readJson(opencodePath);
const pathsConfig = readJson(pathsPath);

const contextRoot = pathsConfig?.paths?.local || pathsConfig?.custom_dir || 'context';
const navigationPath = path.join(root, contextRoot, 'navigation.md');

if (!fs.existsSync(navigationPath)) {
  fail(`Missing navigation file at ${path.relative(root, navigationPath)}`);
} else {
  ok(`Navigation exists: ${path.relative(root, navigationPath)}`);
}

const agentMap = opencode.agent || {};
const agentKeys = new Set(Object.keys(agentMap));

if (agentKeys.size === 0) {
  fail('No agents found in opencode.json (agent map is empty)');
}

for (const [key, value] of Object.entries(agentMap)) {
  const p = value?.path;
  if (!p) {
    fail(`Agent ${key} has no path`);
    continue;
  }
  const full = path.join(root, p);
  if (!fs.existsSync(full)) {
    fail(`Agent path missing: ${key} -> ${p}`);
  }
}

const runtimeDirs = [
  path.join(root, '.opencode', 'agent'),
  path.join(root, 'context', 'core', 'workflows')
];

const openagentPath = path.join(root, '.opencode', 'agent', 'core', 'openagent.md');
if (!fs.existsSync(openagentPath)) {
  fail('Missing .opencode/agent/core/openagent.md');
} else {
  const openagentText = fs.readFileSync(openagentPath, 'utf8');
  if (!openagentText.includes('FAILED. Возвращаю управление.')) {
    fail('openagent.md missing failure terminal phrase policy');
  }
  if (!openagentText.includes('Работа завершена. Возвращаю управление.')) {
    fail('openagent.md missing success terminal phrase policy');
  }
  if (!openagentText.includes('пути вне user scope')) {
    fail('openagent.md missing explicit user scope violation rule');
  }
  if (!openagentText.includes('## One-Shot Mode (Opt-in Only)')) {
    fail('openagent.md missing one-shot section');
  }
  if (!openagentText.includes('Default: OFF.')) {
    fail('openagent.md missing one-shot default-off rule');
  }
  if (!openagentText.includes('one-shot: on') || !openagentText.includes('one-shot: off')) {
    fail('openagent.md missing one-shot on/off trigger rules');
  }

  const requiredModes = [
    'implement-feature',
    'fix-production-bug',
    'add-tests-for-module',
    'refactor-safely',
    'write-and-sync-docs',
    'prepare-release-docs',
    'modern-design',
    'api-change-safe'
  ];
  for (const mode of requiredModes) {
    if (!openagentText.includes(mode)) {
      fail(`openagent.md missing functional mode: ${mode}`);
    }
  }

  if (!openagentText.includes('For `api-change-safe`, `Selected mode` must be exactly `api-change-safe`.')) {
    fail('openagent.md missing api-change-safe selected mode guardrail');
  }
  if (!openagentText.includes('For `api-change-safe`, `Selected route` must be `subagents/code/coder-agent -> subagents/code/tester -> subagents/core/docwriter`.')) {
    fail('openagent.md missing api-change-safe selected route guardrail');
  }
  if (!openagentText.includes('Selected mode: api-change-safe')) {
    fail('openagent.md missing api-change-safe exact output template marker');
  }
  if (!openagentText.includes('if mode/route output format is violated, return exactly `FAILED. Возвращаю управление.`')) {
    fail('openagent.md missing api-change-safe format-fail rule');
  }
  if (!openagentText.includes('Design Decision Lock')) {
    fail('openagent.md missing modern-design decision lock guardrail');
  }
  if (!openagentText.includes('For `modern-design`, `Selected route` must be `subagents/core/contextscout -> subagents/research/externalscout -> subagents/code/coder-agent`.')) {
    fail('openagent.md missing modern-design route guardrail');
  }
}

const runtimeFiles = [];
for (const d of runtimeDirs) {
  if (!fs.existsSync(d)) continue;
  const stack = [d];
  while (stack.length > 0) {
    const curr = stack.pop();
    const entries = fs.readdirSync(curr, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(curr, e.name);
      if (e.isDirectory()) stack.push(fp);
      else if (e.isFile() && fp.endsWith('.md')) runtimeFiles.push(fp);
    }
  }
}

const subagentTypeRegex = /subagent_type\s*=\s*"([^"]+)"/g;
for (const f of runtimeFiles) {
  const text = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = subagentTypeRegex.exec(text)) !== null) {
    const id = m[1];
    if (!agentKeys.has(id)) {
      fail(`Unknown subagent_type in ${path.relative(root, f)}: ${id}`);
    }
  }
}

const legacyPatterns = [
  /specialist\//,
  /planning\/planner/,
  /research\/external-scout/,
  /subagents\/external-scout/,
  /core\/opencoder/
];

for (const f of runtimeFiles) {
  const text = fs.readFileSync(f, 'utf8');
  for (const pattern of legacyPatterns) {
    if (pattern.test(text)) {
      fail(`Legacy identifier match in ${path.relative(root, f)}: ${pattern}`);
    }
  }
}

const hardcodedContextPattern = /`context\/(?!core\/config\/paths\.json)/g;
for (const f of runtimeFiles) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const allowed = rel === 'context/core/workflows/delegation.md';
  if (allowed) continue;
  const text = fs.readFileSync(f, 'utf8');
  if (hardcodedContextPattern.test(text) && rel.startsWith('.opencode/agent/')) {
    fail(`Hardcoded context path in ${rel}; use paths.json guidance`);
  }
}

const contextScoutPath = path.join(root, '.opencode', 'agent', 'subagents', 'core', 'contextscout.md');
if (!fs.existsSync(contextScoutPath)) {
  fail('Missing .opencode/agent/subagents/core/contextscout.md');
} else {
  const contextScoutText = fs.readFileSync(contextScoutPath, 'utf8');
  if (!contextScoutText.includes('FAILED. Возвращаю управление.')) {
    fail('contextscout.md missing failure terminal phrase policy');
  }
}

const delegationWorkflowPath = path.join(root, 'context', 'core', 'workflows', 'delegation.md');
if (!fs.existsSync(delegationWorkflowPath)) {
  fail('Missing context/core/workflows/delegation.md');
} else {
  const delegationText = fs.readFileSync(delegationWorkflowPath, 'utf8');
  const requiredModes = [
    'implement-feature',
    'fix-production-bug',
    'add-tests-for-module',
    'refactor-safely',
    'write-and-sync-docs',
    'prepare-release-docs',
    'modern-design',
    'api-change-safe'
  ];
  for (const mode of requiredModes) {
    if (!delegationText.includes(mode)) {
      fail(`delegation.md missing functional mode: ${mode}`);
    }
  }
}

const instructionsPath = path.join(root, 'instructions.md');
if (!fs.existsSync(instructionsPath)) {
  fail('Missing instructions.md');
} else {
  const instructionsText = fs.readFileSync(instructionsPath, 'utf8');
  if (!instructionsText.includes('skill/tools/api-change-safe.md')) {
    fail('instructions.md missing api-change-safe skill wiring');
  }
  if (!instructionsText.includes('release-docs-sync profile')) {
    fail('instructions.md missing release-docs-sync profile wiring');
  }
  if (!instructionsText.includes('modern-design-research profile')) {
    fail('instructions.md missing modern-design-research profile wiring');
  }
  if (!instructionsText.includes('One-shot mode: только opt-in')) {
    fail('instructions.md missing one-shot opt-in policy');
  }
}

if (process.exitCode && process.exitCode !== 0) {
  const failMessage = smokeMode
    ? 'Functional smoke FAILED. See errors above.'
    : 'Runtime governance validation finished with errors.';
  console.error(failMessage);
} else {
  const passMessage = smokeMode
    ? 'Functional smoke PASSED.'
    : 'Runtime governance validation passed.';
  ok(passMessage);
}
