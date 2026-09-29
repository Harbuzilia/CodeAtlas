// Model presets: remap models to agent roles from a data file.
//
// The agent->model assignment lives in agent frontmatter (`model:` + optional
// `variant:`), but maintaining 12 files by hand is exactly the chore nobody
// does. This script treats config/model-presets.json as the single source of
// truth (presets-as-data) and applies a preset surgically — preserving the
// hand-written frontmatter formatting, like the registry bump in release-gen.
//
// Usage:
//   node scripts/model-presets.mjs                  # show active assignments
//   node scripts/model-presets.mjs --list           # list presets
//   node scripts/model-presets.mjs --show <preset>  # table for one preset
//   node scripts/model-presets.mjs --check          # drift check (exit 1), for CI
//   node scripts/model-presets.mjs --apply <preset> # write model/variant into agents
//
// Adding a future model (MiniMax, GPT-5.x, Astro...): add it to the
// provider.models catalog in opencode.json, then reference it here —
// "provider/model-id" plus an optional variant that exists in its catalog entry.

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);

const PRESETS_PATH = path.join(root, 'config', 'model-presets.json');
const OPENCODE_JSON = path.join(root, 'opencode.json');
const AGENTS_DIR = path.join(root, 'agents');

const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
};

/** Catalog of available models: Map "provider/model" -> Set(variant names). */
function readCatalog() {
  const cfg = JSON.parse(fs.readFileSync(OPENCODE_JSON, 'utf8'));
  const catalog = new Map();
  for (const [providerId, provider] of Object.entries(cfg.provider || {})) {
    for (const [modelId, model] of Object.entries(provider.models || {})) {
      catalog.set(`${providerId}/${modelId}`, new Set(Object.keys(model.variants || {})));
    }
  }
  return catalog;
}

const presetsFile = JSON.parse(fs.readFileSync(PRESETS_PATH, 'utf8'));
const presets = presetsFile.presets;
const active = presetsFile.active;

/** Agent files on disk (the roster every preset must cover). */
const agentFiles = fs
  .readdirSync(AGENTS_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .sort();

// --- integrity: presets must reference real agents, real models, real variants ---
// An empty agents map is the special "inherit" preset: no model lines at all,
// agents inherit the session model (projects with their own provider catalog).
const isInheritPreset = (preset) => Object.keys(preset.agents).length === 0;

const catalog = readCatalog();
for (const [presetName, preset] of Object.entries(presets)) {
  for (const [agent, entry] of Object.entries(preset.agents)) {
    if (!agentFiles.includes(agent)) fail(`пресет "${presetName}": неизвестный агент "${agent}"`);
    if (!catalog.has(entry.model)) {
      fail(
        `пресет "${presetName}", агент ${agent}: модель "${entry.model}" отсутствует в каталоге opencode.json. ` +
          `Примените \`npm run models:apply -- inherit\` (агенты унаследуют модель сессии) или добавьте свою модель/пресет под локальный каталог.`,
      );
    }
    if (entry.variant && !catalog.get(entry.model).has(entry.variant)) {
      fail(`пресет "${presetName}", агент ${agent}: вариант "${entry.variant}" не объявлен для ${entry.model}`);
    }
  }
  if (!isInheritPreset(preset)) {
    for (const agent of agentFiles) {
      if (!preset.agents[agent]) fail(`пресет "${presetName}": не покрывает агента "${agent}" (пресеты должны быть полными)`);
    }
  }
}
if (!presets[active]) fail(`активный пресет "${active}" не найден в config/model-presets.json`);

/** Parse the current model/variant assignment from an agent's frontmatter. */
function readAssignment(agent) {
  const text = fs.readFileSync(path.join(AGENTS_DIR, `${agent}.md`), 'utf8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) fail(`agents/${agent}.md: нет YAML frontmatter`);
  const model = fm[1].match(/^model:\s*(.+)$/m);
  const variant = fm[1].match(/^variant:\s*(.+)$/m);
  const strip = (v) => (v ? v.trim().replace(/^["'](.*)["']$/, '$1') : undefined);
  return { model: strip(model?.[1]), variant: strip(variant?.[1]) };
}

/** Rewrite model/variant lines in an agent's frontmatter, keeping formatting.
 *  An entry without model/variant strips the corresponding line (inherit). */
function writeAssignment(agent, entry) {
  const file = path.join(AGENTS_DIR, `${agent}.md`);
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) fail(`agents/${agent}.md: нет YAML frontmatter`);
  const eol = match[0].startsWith('---\r\n') ? '\r\n' : '\n';
  let fm = match[1];

  if (entry.model) {
    if (/^model:/m.test(fm)) {
      fm = fm.replace(/^model:[^\n]*/m, `model: ${entry.model}`);
    } else {
      // No model line yet: insert right after `mode:` (present in all our agents).
      // Capture excludes \r so a CRLF frontmatter keeps exactly one line ending.
      if (/^mode:/m.test(fm)) fm = fm.replace(/^(mode:[^\r\n]*)/m, `$1${eol}model: ${entry.model}`);
      else fm = `model: ${entry.model}${eol}${fm}`;
    }
  } else if (/^model:/m.test(fm)) {
    fm = fm.replace(/^model:[^\n]*\r?\n?/m, '');
  }

  if (entry.variant) {
    if (/^variant:/m.test(fm)) {
      fm = fm.replace(/^variant:[^\n]*/m, `variant: ${entry.variant}`);
    } else {
      fm = fm.replace(/^(model:[^\r\n]*)/m, `$1${eol}variant: ${entry.variant}`);
    }
  } else if (/^variant:/m.test(fm)) {
    // A leftover variant from a previous preset would break a variant-less model.
    fm = fm.replace(/^variant:[^\n]*\r?\n?/m, '');
  }

  fs.writeFileSync(file, text.replace(match[0], `---${eol}${fm}${eol}---`), 'utf8');
}

// --- CLI ---

if (args.includes('--list')) {
  console.log('Model presets (config/model-presets.json):');
  for (const [name, preset] of Object.entries(presets)) {
    const marker = name === active ? ' ← активный' : '';
    console.log(`  - ${name}${marker}: ${preset.description}`);
  }
  process.exit(0);
}

const showPreset = args.includes('--show') ? (args[args.indexOf('--show') + 1] || active) : active;
if (!presets[showPreset]) fail(`пресет "${showPreset}" не найден`);

if (args.includes('--check')) {
  const issues = [];
  const inherit = isInheritPreset(presets[active]);
  for (const agent of agentFiles) {
    const expected = presets[active].agents[agent] ?? {};
    const current = readAssignment(agent);
    const wantModel = inherit ? undefined : expected.model;
    const wantVariant = inherit ? undefined : expected.variant;
    if (current.model !== wantModel) {
      issues.push(
        inherit
          ? `${agent}: model "${current.model}" назначена, но активен пресет inherit (модель должна наследоваться)`
          : `${agent}: model "${current.model ?? '—'}" ≠ пресет "${wantModel}"`,
      );
    }
    if ((current.variant ?? undefined) !== (wantVariant ?? undefined)) {
      issues.push(`${agent}: variant "${current.variant ?? '—'}" ≠ пресет "${wantVariant ?? '—'}"`);
    }
  }
  if (issues.length > 0) {
    console.error(`FAIL: назначения моделей дрейфуют от пресета "${active}" (${issues.length}):`);
    for (const i of issues) console.error(`  - ${i}`);
    console.error('Run: npm run models:apply');
    process.exit(1);
  }
  console.log(`OK: модели ${agentFiles.length} агентов соответствуют пресету "${active}" (config/model-presets.json).`);
  process.exit(0);
}

if (args.includes('--apply')) {
  const target = args[args.indexOf('--apply') + 1];
  if (!target || !presets[target]) fail(`укажи пресет: --apply <${Object.keys(presets).join('|')}>`);
  const assignments = isInheritPreset(presets[target])
    ? agentFiles.map((agent) => [agent, {}]) // inherit: strip model/variant everywhere
    : Object.entries(presets[target].agents);
  for (const [agent, entry] of assignments) {
    writeAssignment(agent, entry);
    console.log(`   ✅ ${agent}: ${entry.model ? `${entry.model}${entry.variant ? `:${entry.variant}` : ''}` : 'наследует модель сессии'}`);
  }
  // Flip the active marker in the presets file (surgical, keeps formatting).
  const raw = fs.readFileSync(PRESETS_PATH, 'utf8');
  fs.writeFileSync(
    PRESETS_PATH,
    raw.replace(new RegExp(`("active"\\s*:\\s*)"${active.replace(/"/g, '\\"')}"`), `$1"${target}"`),
    'utf8',
  );
  console.log(`OK: пресет "${target}" применён к ${agentFiles.length} агентам и помечен активным.`);
  process.exit(0);
}

// Default: show the active assignment table.
console.log(`Активный пресет: ${active} — ${presets[active].description}\n`);
for (const agent of agentFiles) {
  const current = readAssignment(agent);
  const expected = presets[active].agents[agent];
  const drift =
    current.model !== expected.model || (current.variant ?? undefined) !== (expected.variant ?? undefined);
  console.log(
    `  ${agent.padEnd(14)} ${current.model ?? '—'}${current.variant ? `:${current.variant}` : ''}${drift ? `   ⚠️ дрейф (пресет: ${expected.model}${expected.variant ? `:${expected.variant}` : ''})` : ''}`,
  );
}
console.log('\nПресеты: npm run models -- --list | применить: npm run models:apply -- <preset>');
