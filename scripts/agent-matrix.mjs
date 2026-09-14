import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('        📋 OPENCODE AGENT CAPABILITY MATRIX        ');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// Derive agent metadata from agents/*.md frontmatter (single source of truth).
// ---------------------------------------------------------------------------

function parseFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentVal = [];
  const maps = {};

  for (const line of lines) {
    // Nested key under currentKey, e.g. inside `tools:` map:
    //   tools:
    //     read: true
    const nested = line.match(/^\s{2,}([A-Za-z0-9_]+):\s*(.+)$/);
    if (nested && currentKey) {
      if (!maps[currentKey]) maps[currentKey] = {};
      const v = nested[2].trim();
      maps[currentKey][nested[1]] = v === 'true' ? true : v === 'false' ? false : v.replace(/^["']|["']$/g, '');
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (kv) {
      if (currentKey) fm[currentKey] = currentVal.join('\n');
      currentKey = kv[1];
      currentVal = [kv[2].trim().replace(/^["']|["']$/g, '')];
    } else if (currentKey && /^\s+/.test(line)) {
      currentVal.push(line.trim().replace(/^["']|["']$/g, ''));
    }
  }
  if (currentKey) fm[currentKey] = currentVal.join('\n');
  return { ...fm, ...maps };
}

const agentsDir = path.join(root, 'agents');
const agentFiles = fs.existsSync(agentsDir)
  ? fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md')).sort()
  : [];

// Load opencode.json registration to determine mode (primary vs subagent).
let registered = new Set();
const opencodePath = path.join(root, 'opencode.json');
if (fs.existsSync(opencodePath)) {
  try {
    registered = new Set(Object.keys(JSON.parse(fs.readFileSync(opencodePath, 'utf8')).agent || {}));
  } catch {}
}

const agents = agentFiles.map((file) => {
  const id = file.replace('.md', '');
  const fm = parseFrontmatter(path.join(agentsDir, file));
  const steps = parseInt(fm.steps, 10) || 0;
  const role = (fm.description || '—').replace(/^["']|["']$/g, '').slice(0, 42);
  const writeTools = ['write', 'edit', 'patch'].filter((t) => fm.tools?.[t] === true);
  return {
    id,
    steps,
    role,
    mode: fm.mode || (registered.has(id) ? 'subagent' : 'primary'),
    write: writeTools.length > 0 ? writeTools.join(', ') : 'Read-only'
  };
});

console.log(`🤖 Active Agents (${agents.length}):\n`);
console.log('| Agent ID       | Steps | Role                            | Write Permissions             |');
console.log('| :------------- | :---- | :------------------------------ | :---------------------------- |');
for (const a of agents) {
  console.log(`| ${a.id.padEnd(14)} | ${a.steps.toString().padStart(5)} | ${a.role.padEnd(31)} | ${a.write.padEnd(29)} |`);
}

const skillsDir = path.join(root, 'skills');
const skills = fs.existsSync(skillsDir)
  ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];

console.log(`\n🛠️  Validated Skills (${skills.length} total):`);
console.log(skills.map((s) => `\`${s}\``).join(', '));

const cmdDir = path.join(root, 'command');
const commands = fs.existsSync(cmdDir)
  ? fs.readdirSync(cmdDir).filter((f) => f.endsWith('.md')).map((f) => f.replace('.md', '')).sort()
  : [];
console.log(`\n⚡ Slash Commands (${commands.length} total):`);
console.log(commands.map((c) => `/${c}`).join(', '));

console.log('\n====================================================\n');
