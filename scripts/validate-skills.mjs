// Validates the skill catalogue: disk layout, frontmatter, and the human-facing
// list in instructions.md. Without this, the advertised count silently drifts from
// what actually exists (that drift is what made the registry claim "36" while 37
// directories were on disk).
//
// Checks:
//  1. every skills/<name>/ has a SKILL.md
//  2. SKILL.md starts with YAML frontmatter carrying non-empty name + description
//  3. frontmatter `name` matches the directory name
//  4. the list under <skill_loading> in instructions.md matches the disk exactly

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const skillsDir = path.join(root, 'skills');
const instructionsPath = path.join(root, 'instructions.md');

let hasErrors = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  hasErrors = true;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

if (!fs.existsSync(skillsDir)) {
  fail('skills/ directory not found');
  process.exit(1);
}

const dirs = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const onDisk = new Set();

for (const name of dirs) {
  const skillFile = path.join(skillsDir, name, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    fail(`skills/${name}/ has no SKILL.md`);
    continue;
  }
  onDisk.add(name);

  const text = fs.readFileSync(skillFile, 'utf8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) {
    fail(`skills/${name}/SKILL.md has no YAML frontmatter`);
    continue;
  }
  const declaredName = fm[1].match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^(["'])(.*)\1$/, '$2');
  const description = fm[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();

  if (!declaredName) fail(`skills/${name}/SKILL.md frontmatter has no "name"`);
  else if (declaredName !== name) fail(`skills/${name}/SKILL.md declares name "${declaredName}"`);
  if (!description) fail(`skills/${name}/SKILL.md frontmatter has no "description"`);
}

if (!fs.existsSync(instructionsPath)) {
  fail('instructions.md not found');
} else {
  const instructions = fs.readFileSync(instructionsPath, 'utf8');
  const block = instructions.match(/<skill_loading>([\s\S]*?)<\/skill_loading>/);
  if (!block) {
    fail('instructions.md has no <skill_loading> block');
  } else {
    const listed = new Set(
      [...block[1].matchAll(/^ {2}- `([a-z0-9-]+)`/gm)].map((m) => m[1]),
    );

    for (const name of onDisk) {
      if (!listed.has(name)) fail(`skills/${name}/ exists on disk but is not listed in instructions.md`);
    }
    for (const name of listed) {
      if (!onDisk.has(name)) fail(`instructions.md lists "${name}" but skills/${name}/ does not exist`);
    }

    const declaredCount = instructions.match(/Канонический реестр скиллов \((\d+) шт\.\)/)?.[1];
    if (declaredCount && Number(declaredCount) !== listed.size) {
      fail(`instructions.md claims ${declaredCount} skills but lists ${listed.size}`);
    }
    if (!hasErrors) ok(`Skill catalogue coherent: ${listed.size} skills (disk, frontmatter, instructions.md)`);
  }
}

if (hasErrors) {
  console.error('\nSkill validation failed.');
  process.exit(1);
}
ok('Skill validation passed.');
