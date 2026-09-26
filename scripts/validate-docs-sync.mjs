// Guards against documentation drift: several docs declare counts of skills
// and commands ("37 навыков", "23 slash-команд", "Slash-команды (23)"). Commit
// 048a805 shipped "36 навыков" while the disk already had 37 — and no gate
// failed, because nothing compared the declared numbers with reality.
//
// This script counts skills and commands on disk and verifies:
//   - PLANS.md: the declared skill count, the declared command count, and the
//     full command list (every disk command listed, nothing listed twice or
//     invented; the generated `/menu` is explicitly excluded from the list).
//   - command/matrix.md: every "N навык(ов)" and "N slash-команд" claim, that
//     every disk skill is mentioned somewhere in the matrix, and that the
//     "Validated Skills / Slash Commands" registries are EXACT set matches
//     with disk (no phantom names, no missing commands).
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
// Exact-set checks: the "Validated Skills (N total)" / "Slash Commands (N total)"
// registries must list EXACTLY the disk sets — a phantom name (a skill moved to
// context/standards but left in the list) or a missing command must fail, not
// just the count line. The old disk→matrix-only check let a 42-name list pass
// with "(41 total)" green (wave-11 audit finding).
const matrixSkills = [...matrix.matchAll(/Validated Skills \(\d+\s*total\):\s*\n(.+)/g)]
  .flatMap((m) => [...m[1].matchAll(/`([^`]+)`/g)].map((x) => x[1]));
checks += 1;
if (matrixSkills.length === 0) {
  fail('command/matrix.md: список "Validated Skills (N total):" не найден');
} else {
  const diskSet = new Set(skills);
  const listedSet = new Set(matrixSkills);
  for (const s of skills) {
    if (!listedSet.has(s)) fail(`command/matrix.md: навык \`${s}\` есть на диске, но отсутствует в реестре скиллов`);
  }
  for (const s of matrixSkills) {
    if (!diskSet.has(s)) fail(`command/matrix.md: фантом \`${s}\` в реестре скиллов (на диске нет такого)`);
  }
}
const matrixCommands = [...matrix.matchAll(/Slash Commands \(\d+\s*total\):\s*\n(.+)/g)]
  .flatMap((m) => [...m[1].matchAll(/\/([A-Za-z0-9/-]+)/g)].map((x) => x[1]));
checks += 1;
if (matrixCommands.length === 0) {
  fail('command/matrix.md: список "Slash Commands (N total):" не найден');
} else {
  const diskSet = new Set(commands);
  const listedSet = new Set(matrixCommands);
  for (const c of commands) {
    if (!listedSet.has(c)) fail(`command/matrix.md: команда /${c} есть на диске, но отсутствует в списке`);
  }
  for (const c of matrixCommands) {
    if (!diskSet.has(c)) fail(`command/matrix.md: фантом /${c} в списке команд (на диске нет такой)`);
  }
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

// --- Ungated-but-user-visible counts: README, doctor sample, system_map ---
// These rotted silently before (README said 37 while disk had 45, doctor 43/43,
// system_map 23/37). Cheap regex gates close the hole.
const readme = read('README.md');
checks += 1;
const readmeSkills = readme.match(/\| Скиллы \| (\d+) /);
if (!readmeSkills) fail('README.md: строка "| Скиллы | N" не найдена');
else if (Number(readmeSkills[1]) !== skills.length) {
  fail(`README.md: заявлено ${readmeSkills[1]} скиллов, на диске ${skills.length}`);
}
checks += 1;
const readmeCmds = readme.match(/\| Slash-команды \| (\d+) /);
if (!readmeCmds) fail('README.md: строка "| Slash-команды | N" не найдена');
else if (Number(readmeCmds[1]) !== commands.length) {
  fail(`README.md: заявлено ${readmeCmds[1]} команд, на диске ${commands.length}`);
}

const doctor = read('command/doctor.md');
checks += 1;
const doctorSkills = doctor.match(/(\d+)\/\d+ skills verified/);
if (!doctorSkills) fail('command/doctor.md: пример "N/N skills verified" не найден');
else if (Number(doctorSkills[1]) !== skills.length) {
  fail(`command/doctor.md: в примере ${doctorSkills[1]} скиллов, на диске ${skills.length}`);
}

const sysmap = read('docs/architecture/system_map.md');
checks += 1;
const sysmapSkills = sysmap.match(/- Skills: (\d+) /);
if (!sysmapSkills) fail('system_map.md: строка "- Skills: N" не найдена');
else if (Number(sysmapSkills[1]) !== skills.length) {
  fail(`system_map.md: заявлено ${sysmapSkills[1]} скиллов, на диске ${skills.length} (перегенерируй: npm run arch)`);
}
checks += 1;
const sysmapCmds = sysmap.match(/- Slash commands: (\d+) /);
if (!sysmapCmds) fail('system_map.md: строка "- Slash commands: N" не найдена');
else if (Number(sysmapCmds[1]) !== commands.length) {
  fail(`system_map.md: заявлено ${sysmapCmds[1]} команд, на диске ${commands.length} (перегенерируй: npm run arch)`);
}

if (hasErrors) {
  console.error('\nDocs sync validation failed.');
  process.exit(1);
}
ok(
  `Docs in sync: ${skills.length} skills / ${commands.length} commands match ` +
    `PLANS.md, PROJECT_GUIDE.md, matrix.md, menu.md, README, doctor, system_map (${checks} checks)`
);
