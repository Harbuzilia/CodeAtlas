import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const lessonsPath = path.join(root, '.opencode', 'lessons_learned.md');

if (!fs.existsSync(lessonsPath)) {
  console.log('No .opencode/lessons_learned.md found. Creating empty template.');
  fs.mkdirSync(path.dirname(lessonsPath), { recursive: true });
  fs.writeFileSync(lessonsPath, '# Lessons Learned (Project Knowledge Base)\n\n', 'utf8');
  process.exit(0);
}

const content = fs.readFileSync(lessonsPath, 'utf8');
const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

const entriesByTag = new Map();
const rawEntries = new Set();

for (const line of lines) {
  if (line.startsWith('#')) continue;
  if (!line.startsWith('-')) continue;

  const tagMatch = line.match(/^-\s*\[([A-Za-z0-9#+.\s_-]+)\]\s*(.*)$/);
  const tag = tagMatch ? tagMatch[1].trim() : 'General';
  const text = tagMatch ? tagMatch[2].trim() : line.replace(/^-\s*/, '').trim();

  if (rawEntries.has(line)) continue;
  rawEntries.add(line);

  if (!entriesByTag.has(tag)) {
    entriesByTag.set(tag, []);
  }
  entriesByTag.get(tag).push(text);
}

let output = '# Lessons Learned (Project Knowledge Base)\n\n';

for (const [tag, items] of entriesByTag.entries()) {
  output += `## [${tag}]\n`;
  for (const item of items) {
    output += `- ${item}\n`;
  }
  output += '\n';
}

fs.writeFileSync(lessonsPath, output.trim() + '\n', 'utf8');
console.log(`Synced ${rawEntries.size} lessons across ${entriesByTag.size} categories.`);
