// Guards against documentation drift: several docs declare counts of skills
// and commands ("37 навыков", "23 slash-команд", "Slash-команды (23)"). Commit
// 048a805 shipped "36 навыков" while the disk already had 37 — and no gate
// failed, because nothing compared the declared numbers with reality.
//
// This script counts skills and commands on disk and verifies:
//   - PLANS.md: the declared skill count, the declared command count, and the
//     full command list (every disk command listed, nothing listed twice or
//     invented; the generated `/menu` is explicitly excluded from the list).
//   - command/matrix.md: every "N навык(ов)" and "N slash-команд" claim, and
//     that every disk skill is mentioned somewhere in the matrix.
//   - PROJECT_GUIDE.md: every disk skill appears in the §7 catalogue.
//   - command/menu.md: the "Slash-команды (N)" claim.

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let hasErrors = false;
let checks = 0;

const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  hasErrors = true;
};
const ok = (msg) => console.log(`OK: ${msg}`);
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const skills = fs
  .readdirSync(path.join(root, 'skills'), { withFileTypes: true })
  .filter(
    (e) => e.isDirectory() && fs.existsSync(path.join(root, 'skills', e.name, 'SKILL.md'))
  )
  .map((e) => e.name)
  .sort();

// Same discovery convention as agent-matrix.mjs / session-stats.mjs / menu
// generation: recursive, generated menu.md excluded.
function listCommands(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fp = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fp);
      else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'menu.md') {
        out.push(path.relative(dir, fp).split(path.sep).join('/').replace(/\.md$/, ''));
      }
    }
  }
  return out.sort();
}
const commands = listCommands(path.join(root, 'command'));

// --- PLANS.md ---
const plans = read('PLANS.md');
checks += 1;
const skillCountPlans = plans.match(/\*\*Скиллов в системе\*\*:\s*(\d+)\s*навык/);
if (!skillCountPlans) {
  fail('PLANS.md: строка "**Скиллов в системе**: N навык(ов)" не найдена');
} else if (Number(skillCountPlans[1]) !== skills.length) {
  fail(`PLANS.md: заявлено ${skillCountPlans[1]} навыков, на диске ${skills.length}`);
}

const cmdLine = plans.match(/- \*\*Slash-команд\*\*:\s*(\d+)[^\n]*/);
checks += 1;
if (!cmdLine) {
  fail('PLANS.md: строка "**Slash-команд**: N" не найдена');
} else {
  if (Number(cmdLine[1]) !== commands.length) {
    fail(`PLANS.md: заявлено ${cmdLine[1]} команд, на диске ${commands.length}`);
  }
  const listed = [...cmdLine[0].matchAll(/`\/([A-Za-z0-9/-]+)`/g)]
    .map((m) => m[1])
    .filter((c) => c !== 'menu'); // generated, not a source command
  const diskSet = new Set(commands);
  const listSet = new Set(listed);
  for (const c of commands) {
    if (!listSet.has(c)) fail(`PLANS.md: команда /${c} есть на диске, но не в списке`);
  }
  for (const c of listed) {
    if (!diskSet.has(c)) fail(`PLANS.md: команда /${c} в списке, но отсутствует на диске`);
  }
}

// --- command/matrix.md ---
const matrix = read('command/matrix.md');
checks += 1;
let skillClaims = 0;
for (const m of matrix.matchAll(/(\d+)\s+(?:специализированных\s+)?навык/g)) {
  skillClaims += 1;
  if (Number(m[1]) !== skills.length) {
    fail(`command/matrix.md: заявлено ${m[1]} навыков, на диске ${skills.length}`);
  }
}
if (skillClaims === 0) fail('command/matrix.md: не найдено ни одного упоминания "N навыков"');
for (const m of matrix.matchAll(/(\d+)\s+slash-команд/g)) {
  checks += 1;
  if (Number(m[1]) !== commands.length) {
    fail(`command/matrix.md: заявлено ${m[1]} slash-команд, на диске ${commands.length}`);
  }
}
for (const s of skills) {
  checks += 1;
  if (!matrix.includes(s)) fail(`command/matrix.md: навык \`${s}\` отсутствует в реестре`);
}

// --- PROJECT_GUIDE.md ---
const guide = read('PROJECT_GUIDE.md');
for (const s of skills) {
  checks += 1;
  if (!guide.includes(`\`${s}\``)) {
    fail(`PROJECT_GUIDE.md: навык \`${s}\` отсутствует в каталоге §7`);
  }
}

// --- command/menu.md ---
const menu = read('command/menu.md');
checks += 1;
const menuCount = menu.match(/Slash-команды \((\d+)\)/);
if (!menuCount) {
  fail('command/menu.md: строка "Slash-команды (N)" не найдена');
} else if (Number(menuCount[1]) !== commands.length) {
  fail(`command/menu.md: заявлено ${menuCount[1]} команд, на диске ${commands.length}`);
}

if (hasErrors) {
  console.error('\nDocs sync validation failed.');
  process.exit(1);
}
ok(
  `Docs in sync: ${skills.length} skills / ${commands.length} commands match ` +
    `PLANS.md, PROJECT_GUIDE.md, matrix.md, menu.md (${checks} checks)`
);
