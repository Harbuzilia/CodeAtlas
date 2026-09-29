import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('     🏛️ OPENCODE LIVE C4 ARCHITECTURE VISUALIZER    ');
console.log('====================================================\n');

// ---------------------------------------------------------------------------
// Build the diagram from real project artifacts:
//   - agents/          -> agent nodes
//   - command/         -> command nodes
//   - skills/          -> skill nodes
//   - routing matrix   -> delegation edges (parsed from agents/openagent.md)
// ---------------------------------------------------------------------------

function parseFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentVal = [];
  for (const line of lines) {
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
  return fm;
}

// 1. Agents
const agentsDir = path.join(root, 'agents');
const agentFiles = fs.existsSync(agentsDir) ? fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md')).sort() : [];
const agents = agentFiles.map((f) => {
  const id = f.replace('.md', '');
  const fm = parseFrontmatter(path.join(agentsDir, f));
  return { id, role: (fm.description || '').replace(/^["']|["']$/g, '').slice(0, 40) };
});

// 2. Commands — walk subfolders too (commands may be namespaced, e.g.
//    prompt-engineering/prompt-optimizer), and skip the generated menu.
const cmdDir = path.join(root, 'command');
const commands = [];
if (fs.existsSync(cmdDir)) {
  const stack = [cmdDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'menu.md') {
        commands.push(path.relative(cmdDir, abs).split(path.sep).join('/').replace(/\.md$/, ''));
      }
    }
  }
  commands.sort();
}

// 3. Skills
const skillsDir = path.join(root, 'skills');
const skills = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];

// 4. Routing edges from the functional modes table.
function parseRouteCell(cell) {
  const withoutParens = cell.replace(/\([^)]*\)/g, ' ');
  const tokens = [];
  for (const m of withoutParens.matchAll(/`([A-Za-z0-9_]+)`/g)) {
    const prefix = withoutParens.slice(0, m.index);
    if (/optional\s*$/.test(prefix.trimEnd())) continue;
    tokens.push(m[1]);
  }
  return tokens;
}

const edges = [];
const openagentPath = path.join(root, 'agents', 'openagent.md');
if (fs.existsSync(openagentPath)) {
  const text = fs.readFileSync(openagentPath, 'utf8').replace(/\r\n/g, '\n');
  const fmSection = text.match(/<functional_modes>([\s\S]*?)<\/functional_modes>/);
  if (fmSection) {
    const table = fmSection[1].match(/^\| Mode \| Trigger \| Route \|[\s\S]*?\n\|[-:\s|]+\|\n([\s\S]*?)(?=\n\n|\nMode rule:)/m);
    if (table) {
      for (const row of table[1].split('\n')) {
        const cells = row.split('|').map((c) => c.trim());
        if (cells.length < 4) continue;
        const route = parseRouteCell(cells[3] || '');
        if (route.length > 1) {
          for (let i = 0; i < route.length - 1; i++) {
            edges.push(`${route[i]} --> ${route[i + 1]}`);
          }
        }
      }
    }
  }
}

// Several modes traverse the same hop, so collapse duplicates: a routing graph
// with repeated identical edges is noise, and the edge count was inflated by them.
const uniqueEdges = [...new Set(edges)];

// 5. Emit the diagram.
const agentLines = agents.map((a) => `    ${a.id}["${a.id}"]`);
const cmdLines = commands.map((c) => `    cmd_${c}["/${c}"]`);
const skillLines = skills.map((s) => `    skill_${s}["${s}"]`);

const diagram = `\`\`\`mermaid
graph TD
    User["Developer"] -->|"Slash Commands & Natural Language"| OpenAgent["openagent (Orchestrator)"]
${agentLines.filter((l) => !l.includes('openagent')).join('\n')}
${cmdLines.join('\n')}
${skillLines.join('\n')}
${uniqueEdges.join('\n')}
\`\`\``;

const outputDir = path.join(root, 'docs', 'architecture');
fs.mkdirSync(outputDir, { recursive: true });
const outputFile = path.join(outputDir, 'system_map.md');

const fullDoc = `# System Architecture Map (Live C4 Container & Workflow Model)

*Generated automatically via \`npm run arch\` on ${new Date().toISOString().split('T')[0]}.*

## 1. High-Level Agent & Subsystem Interactions

${diagram}

## 2. Inventory (generated from disk)
- Agents: ${agents.length} (${agents.map((a) => a.id).join(', ')})
- Slash commands: ${commands.length} (${commands.map((c) => '/' + c).join(', ')})
- Skills: ${skills.length} (${skills.join(', ')})
- Delegation edges from functional_modes table: ${uniqueEdges.length}
`;

fs.writeFileSync(outputFile, fullDoc, 'utf8');

console.log(`✅ C4 Architecture map generated at: ${path.relative(root, outputFile)}`);
console.log(`   - ${agents.length} agents, ${commands.length} commands, ${skills.length} skills, ${uniqueEdges.length} routing edges.`);
console.log('====================================================\n');
