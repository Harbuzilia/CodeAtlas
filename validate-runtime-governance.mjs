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
  path.join(root, 'agents'),
  path.join(root, '.opencode', 'agents'), // backward-compatible optional layout
  path.join(root, 'context', 'core', 'workflows')
];

const openagentPath = path.join(root, 'agents', 'openagent.md');
if (!fs.existsSync(openagentPath)) {
  fail('Missing agents/openagent.md');
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
  if (!openagentText.includes('code/tests имеют приоритет, docs идут в to-sync follow-up')) {
    fail('openagent.md missing code-vs-docs priority rule');
  }
  if (!openagentText.includes('If selected route requires delegation, call task(...) in the same turn immediately after routing block.')) {
    fail('openagent.md missing atomic delegation MUST rule');
  }
  if (!openagentText.includes('If delegation path is selected but task(...) is not called in the same turn, return exactly `FAILED. Возвращаю управление.`')) {
    fail('openagent.md missing atomic delegation ERROR rule');
  }
  if (!openagentText.includes('NO CONFIRM GATE: When route=delegate, do not ask user approval/confirm/"продолжай" between Routing and task(...).')) {
    fail('openagent.md missing no-confirm gate rule for immediate handoff');
  }
  if (openagentText.includes('**NEVER** пропускай approval для write/edit')) {
    fail('openagent.md still contains global approval gate that can block delegation');
  }
  if (openagentText.includes('**NEVER** исправляй ошибки без подтверждения')) {
    fail('openagent.md still contains global confirm gate that can block delegation');
  }

  const routingBlocks = [...openagentText.matchAll(/\nRouting\n[\s\S]{0,240}?- Delegating\.\.\./g)];
  if (routingBlocks.length === 0) {
    fail('openagent.md has no routing block with Delegating marker');
  }
  for (const block of routingBlocks) {
    const start = block.index ?? 0;
    const nearText = openagentText.slice(start, start + 700);
    if (!nearText.includes('task(')) {
      fail('openagent.md has routing block without task(...) call in same-turn window');
    }
  }

  if (/[🔀├└]/u.test(openagentText)) {
    fail('openagent.md contains forbidden Unicode routing symbols');
  }

  const requiredModes = [
    'implement-feature',
    'fix-production-bug',
    'add-tests-for-module',
    'refactor-safely',
    'write-and-sync-docs',
    'prepare-release-docs',
    'modern-design',
    'modern-backend-upgrade',
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
  if (!openagentText.includes('For `api-change-safe`, `Selected route` must be `coder -> tester -> docwriter`.')) {
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
  if (!openagentText.includes('For `modern-design`, `Selected route` must be `contextscout -> externalscout -> coder`.')) {
    fail('openagent.md missing modern-design route guardrail');
  }
  if (!openagentText.includes('Backend Upgrade Decision Lock')) {
    fail('openagent.md missing modern-backend-upgrade decision lock guardrail');
  }
  if (!openagentText.includes('For `modern-backend-upgrade`, `Selected route` must be `contextscout -> externalscout -> coder -> tester`.')) {
    fail('openagent.md missing modern-backend-upgrade route guardrail');
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
const forbiddenAliasSubagentTypes = new Set([
  'ContextScout',
  'CoderAgent',
  'Debugger',
  'TestEngineer',
  'CodeReviewer',
  'TaskManager',
  'ExternalScout',
  'DocWriter'
]);
for (const f of runtimeFiles) {
  const text = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = subagentTypeRegex.exec(text)) !== null) {
    const id = m[1];
    if (!agentKeys.has(id)) {
      fail(`Unknown subagent_type in ${path.relative(root, f)}: ${id}`);
      continue;
    }
    if (forbiddenAliasSubagentTypes.has(id)) {
      fail(`Legacy alias subagent_type in ${path.relative(root, f)}: ${id}`);
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
  if (hardcodedContextPattern.test(text) && (rel.startsWith('agents/') || rel.startsWith('.opencode/agents/'))) {
    fail(`Hardcoded context path in ${rel}; use paths.json guidance`);
  }
}

const contextScoutPath = path.join(root, 'agents', 'contextscout.md');
if (!fs.existsSync(contextScoutPath)) {
  fail('Missing agents/contextscout.md');
} else {
  const contextScoutText = fs.readFileSync(contextScoutPath, 'utf8');
  if (!contextScoutText.includes('FAILED. Возвращаю управление.')) {
    fail('contextscout.md missing failure terminal phrase policy');
  }
  if (!contextScoutText.includes('Conflict Detected')) {
    fail('contextscout.md missing conflict-detected reporting block');
  }
  if (!contextScoutText.includes('Источник истины для поведения: код и тесты.')) {
    fail('contextscout.md missing code-over-docs conflict policy');
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
    'modern-backend-upgrade',
    'api-change-safe'
  ];
  for (const mode of requiredModes) {
    if (!delegationText.includes(mode)) {
      fail(`delegation.md missing functional mode: ${mode}`);
    }
  }
  if (!delegationText.includes('If `contextscout` reports `Conflict Detected` (code vs docs), use code/tests as behavior source')) {
    fail('delegation.md missing code-vs-docs conflict handling rule');
  }
  if (!delegationText.includes('If selected route requires delegation, call task(...) in the same turn immediately after routing block.')) {
    fail('delegation.md missing atomic delegation MUST rule');
  }
  if (!delegationText.includes('If delegation path is selected but task(...) is not called in the same turn, return exactly `FAILED. Возвращаю управление.`')) {
    fail('delegation.md missing atomic delegation ERROR rule');
  }
  if (!delegationText.includes('NO CONFIRM GATE BEFORE HANDOFF')) {
    fail('delegation.md missing no-confirm-before-handoff rule');
  }
  const requiredCanonicalIds = [
    'contextscout',
    'coder',
    'debugger',
    'tester',
    'reviewer',
    'planner',
    'externalscout',
    'docwriter'
  ];
  for (const id of requiredCanonicalIds) {
    if (!delegationText.includes(id)) {
      fail(`delegation.md missing canonical subagent route: ${id}`);
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
  if (!instructionsText.includes('modern-backend-research profile')) {
    fail('instructions.md missing modern-backend-research profile wiring');
  }
  if (!instructionsText.includes('One-shot mode: только opt-in')) {
    fail('instructions.md missing one-shot opt-in policy');
  }
  if (instructionsText.includes('task(subagent_type="subagents/core/contextscout")')) {
    fail('instructions.md contains legacy contextscout subagent_type');
  }
  const instructionsLegacyIdPatterns = [
    '`subagents/code/coder-agent`',
    '`subagents/core/debugger`',
    '`subagents/code/tester`',
    '`subagents/code/reviewer`',
    '`subagents/core/docwriter`',
    '`planning/decomposition`'
  ];
  for (const legacy of instructionsLegacyIdPatterns) {
    if (instructionsText.includes(legacy)) {
      fail(`instructions.md contains legacy delegation identifier: ${legacy}`);
    }
  }
  if (!instructionsText.includes('в том же ходе сразу после Routing')) {
    fail('instructions.md missing same-turn task(...) rule after routing');
  }
}

const patternsPath = path.join(root, 'context', 'project', 'patterns.md');
if (!fs.existsSync(patternsPath)) {
  fail('Missing context/project/patterns.md');
} else {
  const patternsText = fs.readFileSync(patternsPath, 'utf8');
  const requiredPatternIds = [
    '`contextscout`',
    '`coder`',
    '`debugger`',
    '`tester`',
    '`reviewer`',
    '`planner`',
    '`externalscout`',
    '`docwriter`'
  ];
  for (const id of requiredPatternIds) {
    if (!patternsText.includes(id)) {
      fail(`patterns.md missing canonical delegation id: ${id}`);
    }
  }
  const forbiddenPatternCanonicalBlockLegacy = [
    '- `subagents/core/contextscout`',
    '- `subagents/code/coder-agent`',
    '- `subagents/core/debugger`',
    '- `subagents/code/tester`',
    '- `subagents/code/reviewer`',
    '- `subagents/research/externalscout`',
    '- `subagents/core/docwriter`'
  ];
  for (const legacy of forbiddenPatternCanonicalBlockLegacy) {
    if (patternsText.includes(legacy)) {
      fail(`patterns.md still declares legacy canonical id: ${legacy}`);
    }
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
