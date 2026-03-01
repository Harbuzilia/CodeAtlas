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
  const relPath = value?.path;
  if (!relPath) {
    fail(`Agent ${key} has no path`);
    continue;
  }
  if (!fs.existsSync(path.join(root, relPath))) {
    fail(`Agent path missing: ${key} -> ${relPath}`);
  }
}

const requiredSkills = [
  'typescript',
  'python',
  'git',
  'repomap',
  'ast-index'
];

for (const skillName of requiredSkills) {
  const manifestPath = path.join(root, 'skills', skillName, 'SKILL.md');
  if (!fs.existsSync(manifestPath)) {
    fail(`Missing skill manifest: skills/${skillName}/SKILL.md`);
    continue;
  }

  const text = fs.readFileSync(manifestPath, 'utf8');
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) {
    fail(`Skill manifest missing YAML frontmatter: skills/${skillName}/SKILL.md`);
    continue;
  }

  if (!new RegExp(`^name:\\s*${skillName}$`, 'm').test(frontmatter[1])) {
    fail(`Skill manifest name mismatch in skills/${skillName}/SKILL.md`);
  }
  if (!/^description:\s*.+$/m.test(frontmatter[1])) {
    fail(`Skill manifest missing description in skills/${skillName}/SKILL.md`);
  }
}

const openagentPath = path.join(root, 'agents', 'openagent.md');
if (!fs.existsSync(openagentPath)) {
  fail('Missing agents/openagent.md');
} else {
  const text = fs.readFileSync(openagentPath, 'utf8');
  const requiredOpenagentMarkers = [
    'FAILED. Возвращаю управление.',
    'Работа завершена. Возвращаю управление.',
    'пути вне user scope',
    '## One-Shot Mode (Opt-in Only)',
    'Default: OFF.',
    'one-shot: on',
    'one-shot: off',
    'code/tests имеют приоритет, docs идут в to-sync follow-up',
    'If selected route requires delegation, call task(...) in the same turn immediately.',
    'If delegation path is selected but task(...) is not called in the same turn, return exactly `FAILED. Возвращаю управление.`',
    'NO CONFIRM GATE: When route=delegate, do not ask user approval/confirm/"продолжай" before task(...).',
    '[SERIAL-ROUTE] Межагентный route всегда строго последовательный',
    '[PARALLEL-DISCOVERY-ONLY] Параллель разрешен только внутри независимых read-only discovery подшагов',
    'Межагентная цепочка остается строго serial; параллельные task() для route запрещены.'
  ];

  for (const marker of requiredOpenagentMarkers) {
    if (!text.includes(marker)) {
      fail(`openagent.md missing required marker: ${marker}`);
    }
  }

  if (text.includes('**NEVER** пропускай approval для write/edit')) {
    fail('openagent.md still contains global approval gate that can block delegation');
  }
  if (text.includes('**NEVER** исправляй ошибки без подтверждения')) {
    fail('openagent.md still contains global confirm gate that can block delegation');
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
    if (!text.includes(mode)) {
      fail(`openagent.md missing functional mode: ${mode}`);
    }
  }

  if (!text.includes('Design Decision Lock')) {
    fail('openagent.md missing modern-design decision lock guardrail');
  }
  if (!text.includes('Backend Upgrade Decision Lock')) {
    fail('openagent.md missing modern-backend-upgrade decision lock guardrail');
  }
}

const runtimeDirs = [
  path.join(root, 'agents'),
  path.join(root, '.opencode', 'agents'),
  path.join(root, 'context', 'core', 'workflows')
];

const runtimeFiles = [];
for (const dir of runtimeDirs) {
  if (!fs.existsSync(dir)) continue;
  const stack = [dir];
  while (stack.length > 0) {
    const curr = stack.pop();
    const entries = fs.readdirSync(curr, { withFileTypes: true });
    for (const entry of entries) {
      const fp = path.join(curr, entry.name);
      if (entry.isDirectory()) stack.push(fp);
      else if (entry.isFile() && fp.endsWith('.md')) runtimeFiles.push(fp);
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
    if (!agentKeys.has(id)) fail(`Unknown subagent_type in ${path.relative(root, f)}: ${id}`);
    if (forbiddenAliasSubagentTypes.has(id)) fail(`Legacy alias subagent_type in ${path.relative(root, f)}: ${id}`);
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

const migrationScopedFiles = [
  'instructions.md',
  'PROJECT_GUIDE.md',
  'agents/coder.md',
  'agents/reviewer.md',
  'agents/openagent.md',
  'context/core/workflows/delegation.md'
];

const legacySkillRefPatterns = [
  /skill\/languages\//,
  /skill\/tools\//,
  /skill\/review\//,
  /\.config\/opencode\/skill\//
];

for (const rel of migrationScopedFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    fail(`Missing migration-scoped file: ${rel}`);
    continue;
  }
  const text = fs.readFileSync(abs, 'utf8');
  for (const pattern of legacySkillRefPatterns) {
    if (pattern.test(text)) {
      fail(`Legacy path-based skill reference in ${rel}: ${pattern}`);
    }
  }
}

const contextScoutPath = path.join(root, 'agents', 'contextscout.md');
if (!fs.existsSync(contextScoutPath)) {
  fail('Missing agents/contextscout.md');
} else {
  const contextScoutText = fs.readFileSync(contextScoutPath, 'utf8');
  if (!contextScoutText.includes('FAILED. Возвращаю управление.')) fail('contextscout.md missing failure terminal phrase policy');
  if (!contextScoutText.includes('Conflict Detected')) fail('contextscout.md missing conflict-detected reporting block');
  if (!contextScoutText.includes('Источник истины для поведения: код и тесты.')) fail('contextscout.md missing code-over-docs conflict policy');
  if (!contextScoutText.includes('<rule id="safe_parallel_discovery">')) fail('contextscout.md missing safe_parallel_discovery rule');
  if (!contextScoutText.includes('Независимые read-only операции (`glob`/`grep`/`read`) можно запускать батчами в параллель')) fail('contextscout.md missing explicit internal parallel read-only allowance');
}

const delegationPath = path.join(root, 'context', 'core', 'workflows', 'delegation.md');
if (!fs.existsSync(delegationPath)) {
  fail('Missing context/core/workflows/delegation.md');
} else {
  const delegationText = fs.readFileSync(delegationPath, 'utf8');
  const requiredDelegationMarkers = [
    'Process: Analyze → Delegate (serial route) → Monitor → Return',
    'Route between agents is strictly serial.',
    'Safe parallelization is allowed only inside independent read-only discovery sub-steps (glob/grep/read batches).',
    '**SERIAL-ROUTE**: Межагентный route всегда строго последовательный; параллельные task() для route запрещены.',
    '**PARALLEL-DISCOVERY-ONLY**: Параллелизация разрешена только для независимых read-only discovery подшагов (`glob`/`grep`/`read` батчи) и не может менять route-последовательность.'
  ];

  for (const marker of requiredDelegationMarkers) {
    if (!delegationText.includes(marker)) {
      fail(`delegation.md missing required marker: ${marker}`);
    }
  }
}

const instructionsPath = path.join(root, 'instructions.md');
if (!fs.existsSync(instructionsPath)) {
  fail('Missing instructions.md');
} else {
  const text = fs.readFileSync(instructionsPath, 'utf8');
  if (!text.includes('One-shot mode: только opt-in')) fail('instructions.md missing one-shot opt-in policy');
  if (!text.includes('skill({ name: "{skill_name}" })')) fail('instructions.md missing name-based skill loading example');
}

if (process.exitCode && process.exitCode !== 0) {
  console.error(smokeMode ? 'Functional smoke FAILED. See errors above.' : 'Runtime governance validation finished with errors.');
} else {
  ok(smokeMode ? 'Functional smoke PASSED.' : 'Runtime governance validation passed.');
}
