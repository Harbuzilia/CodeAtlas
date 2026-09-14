import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contextDir = path.join(root, 'context');

if (!fs.existsSync(contextDir)) {
  console.error('FAIL: context directory not found');
  process.exit(1);
}

function scanDir(dir, relPrefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const rel = path.join(relPrefix, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const children = scanDir(fullPath, rel);
      result.push({ name: entry.name, path: rel, isDir: true, children });
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      result.push({ name: entry.name, path: rel, isDir: false });
    }
  }

  return result;
}

const tree = scanDir(contextDir);

function renderTree(nodes, indent = '') {
  let text = '';
  for (const node of nodes) {
    if (node.isDir) {
      text += `${indent}- **${node.name}/**\n`;
      text += renderTree(node.children, indent + '  ');
    } else {
      text += `${indent}- [${node.name}](file:///${path.join(root, 'context', node.path).replace(/\\/g, '/')})\n`;
    }
  }
  return text;
}

const navContent = `# Context Navigation

Единый индекс всей контекстной системы проекта.

## Карта контекста
${renderTree(tree)}
`;

const navPath = path.join(contextDir, 'navigation.md');
fs.writeFileSync(navPath, navContent, 'utf8');
console.log('OK: context/navigation.md generated successfully.');
