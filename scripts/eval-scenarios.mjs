import fs from 'node:fs';
import path from 'node:path';

console.log('--- OpenCode Agent Scenario Evaluator (Zero-Token Routing Harness) ---\n');

const root = process.cwd();
let opencode;
try {
  opencode = JSON.parse(fs.readFileSync(path.join(root, 'opencode.json'), 'utf8'));
} catch {
  console.error('[FAIL] Cannot read opencode.json');
  process.exit(1);
}
let openagent;
try {
  openagent = fs.readFileSync(path.join(root, 'agents', 'openagent.md'), 'utf8');
} catch {
  console.error('[FAIL] Cannot read agents/openagent.md');
  process.exit(1);
}
const knownAgents = new Set(Object.keys(opencode.agent || {}));
let knownSkills = new Set();
try {
  knownSkills = new Set(
    fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(root, 'skills', e.name, 'SKILL.md')))
      .map((e) => e.name)
  );
} catch {
  knownSkills = new Set();
}

// Extract functional_modes table: rows `| mode-name | trigger | route |`
const modesBlock = openagent.match(/<functional_modes>([\s\S]*?)<\/functional_modes>/);
if (!modesBlock) {
  console.error('[FAIL] openagent.md: <functional_modes> block not found');
  process.exit(1);
}
const modeRoutes = new Map(); // mode -> ordered agent names mentioned in its Route cell
for (const line of modesBlock[1].split(/\r?\n/)) {
  const m = line.match(/^\|\s*([a-z][a-z0-9-]+)\s*\|[^|]*\|([^|]*)\|/);
  if (!m || m[1] === 'Mode' || m[1].startsWith('--')) continue;
  const agentsInRoute = [...m[2].matchAll(/`([a-z][a-z0-9-]+)`/g)]
    .map((x) => x[1])
    .filter((x) => knownAgents.has(x));
  modeRoutes.set(m[1], agentsInRoute);
}
// One-shot orchestration chains (may add planner/tester/docwriter beyond the table route)
const oneShotBlock = openagent.match(/<one_shot_mode>([\s\S]*?)<\/one_shot_mode>/);
const oneShotRoutes = new Map();
if (oneShotBlock) {
  for (const line of oneShotBlock[1].split(/\r?\n/)) {
    const m = line.match(/^\s*-\s*`([a-z][a-z0-9-]+)`\s*->\s*(.+)$/);
    if (!m) continue;
    oneShotRoutes.set(
      m[1],
      [...m[2].matchAll(/`([a-z][a-z0-9-]+)`/g)].map((x) => x[1]).filter((x) => knownAgents.has(x))
    );
  }
}

const scenarios = [
  { name: 'Production Bug Incident', query: 'Падает NullReferenceException на проде при обработке платежа', expectedMode: 'fix-production-bug', expectedRoute: ['debugger'], expectedSkills: ['incident-response'] },
  { name: 'New Feature Implementation (Small)', query: 'Добавь валидацию email в форму регистрации', expectedMode: 'implement-feature', expectedRoute: ['coder'], expectedSkills: ['typescript'] },
  { name: 'Complex Feature (Multi-file)', query: 'Сделай под ключ интеграцию с платежным шлюзом Stripe (12 файлов)', expectedMode: 'implement-feature', isOneShot: true, expectedRoute: ['planner', 'coder', 'tester', 'docwriter'], expectedSkills: ['typescript', 'context7'] },
  { name: 'Refactor Module Safely', query: 'Отрефактори сервис авторизации без изменения поведения', expectedMode: 'refactor-safely', expectedRoute: ['coder', 'reviewer', 'tester'], expectedSkills: ['performance-optimization'] },
  { name: 'Add Comprehensive Tests', query: 'Добавь тесты на все публичные методы UserService', expectedMode: 'add-tests-for-module', expectedRoute: ['tester'] },
  { name: 'API Contract Change Safe', query: 'Измени формат ответов /api/users с массива на объект с пагинацией', expectedMode: 'api-change-safe', expectedRoute: ['coder', 'tester', 'docwriter'] },
  { name: 'Modern UI Design Refresh', query: 'Сделай современный редизайн лендинга', expectedMode: 'modern-design', expectedRoute: ['contextscout', 'externalscout', 'coder'] },
  { name: 'Modern Backend Upgrade', query: 'Обнови ORM и кэширование до современного стека', expectedMode: 'modern-backend-upgrade', expectedRoute: ['contextscout', 'externalscout', 'coder', 'tester'] },
  { name: 'Documentation Sync', query: 'Обнови README и синхронизируй документацию', expectedMode: 'write-and-sync-docs', expectedRoute: ['docwriter'] },
  { name: 'Release Preparation Docs', query: 'Подготовь документацию к релизу', expectedMode: 'prepare-release-docs', expectedRoute: ['docwriter'] },
  // Аудит идёт не через functional_modes, а через delegation_rules (contextscout AUTO -> reviewer)
  { name: 'Security Audit & Review', query: 'Проведи аудит безопасности модуля авторизации', expectedMode: null, expectedRoute: ['contextscout', 'reviewer'] },
  { name: 'Performance Profiling & Bottleneck Fix', query: 'Найди и исправь бутылочное горлышко в API отчетов', expectedMode: 'refactor-safely', expectedRoute: ['coder', 'reviewer', 'tester'] }
];

let passed = 0;
let failed = 0;

for (const sc of scenarios) {
  const problems = [];
  if (sc.expectedMode === null) {
    // delegation_rules path (без functional mode): проверяем только существование агентов и скиллов
    for (const agent of sc.expectedRoute) {
      if (!knownAgents.has(agent)) problems.push(`agent "${agent}" отсутствует в opencode.json`);
    }
    for (const skill of sc.expectedSkills || []) {
      if (!knownSkills.has(skill)) problems.push(`skill "${skill}" отсутствует в skills/`);
    }
    if (problems.length === 0) {
      console.log(`[OK] [PASS] Scenario: "${sc.name}" -> Mode: (delegation_rules) | Route: ${sc.expectedRoute.join(' -> ')}`);
      passed++;
    } else {
      console.error(`[FAIL] [FAIL] Scenario: "${sc.name}"`);
      for (const p of problems) console.error(`       - ${p}`);
      failed++;
    }
    continue;
  }

  // 1. Mode must exist in openagent.md functional_modes
  if (!modeRoutes.has(sc.expectedMode)) {
    problems.push(`mode "${sc.expectedMode}" отсутствует в <functional_modes>`);
  }

  // 2. Every routed agent must exist in opencode.json
  for (const agent of sc.expectedRoute) {
    if (!knownAgents.has(agent)) problems.push(`agent "${agent}" отсутствует в opencode.json`);
  }

  // 3. Route must be derivable from the mode's table route or its one-shot chain
  const configRoute = modeRoutes.get(sc.expectedMode) || [];
  const configChain = oneShotRoutes.get(sc.expectedMode) || [];
  for (const agent of sc.expectedRoute) {
    if (!configRoute.includes(agent) && !configChain.includes(agent)) {
      problems.push(`agent "${agent}" не входит в route режима (table: [${configRoute}], one-shot: [${configChain}])`);
    }
  }

  // 4. Expected skills must exist on disk
  for (const skill of sc.expectedSkills || []) {
    if (!knownSkills.has(skill)) problems.push(`skill "${skill}" отсутствует в skills/`);
  }

  if (problems.length === 0) {
    console.log(`[OK] [PASS] Scenario: "${sc.name}" -> Mode: ${sc.expectedMode} | Route: ${sc.expectedRoute.join(' -> ')}`);
    passed++;
  } else {
    console.error(`[FAIL] [FAIL] Scenario: "${sc.name}"`);
    for (const p of problems) console.error(`       - ${p}`);
    failed++;
  }
}

// 5. Global: every mode in the table routes only to existing agents
for (const [mode, agents] of modeRoutes) {
  if (agents.length === 0) {
    console.error(`[FAIL] [FAIL] Mode "${mode}" имеет пустой route в <functional_modes>`);
    failed++;
  }
}

console.log(`\nResults: ${passed}/${scenarios.length} scenarios passed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All routing evaluation tests PASSED successfully.');
}
