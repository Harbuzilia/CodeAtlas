import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetDir = process.argv[2] || 'scripts';
const targetPath = path.resolve(root, targetDir);

console.log(`--- 📖 OpenCode AST Documentation Generator for: ${targetDir} ---\n`);

if (!fs.existsSync(targetPath)) {
  console.error(`Error: Path ${targetPath} does not exist.`);
  process.exit(1);
}

const entries = fs.readdirSync(targetPath, { withFileTypes: true });
const documentedFiles = [];

for (const entry of entries) {
  if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs') || entry.name.endsWith('.ts') || entry.name.endsWith('.cs') || entry.name.endsWith('.py'))) {
    const full = path.join(targetPath, entry.name);
    const content = fs.readFileSync(full, 'utf8');

    const funcs = [];
    const funcRegex = /(?:export\s+(?:async\s+)?function|def|public\s+(?:async\s+)?[A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      funcs.push({ name: match[1], params: match[2].trim() });
    }

    documentedFiles.push({ file: entry.name, funcs });
  }
}

let markdown = `# Module Documentation: ${targetDir}\n\nGenerated automatically via \`npm run docgen\` on ${new Date().toISOString().split('T')[0]}.\n\n`;

for (const doc of documentedFiles) {
  markdown += `## 📄 \`${doc.file}\`\n\n`;
  if (doc.funcs.length === 0) {
    markdown += `*Executable script or configuration module.*\n\n`;
  } else {
    markdown += `### Functions & Methods:\n`;
    for (const f of doc.funcs) {
      markdown += `- \`${f.name}(${f.params})\`\n`;
    }
    markdown += `\n`;
  }
}

const outputDir = path.join(root, 'docs', 'modules');
fs.mkdirSync(outputDir, { recursive: true });
const outputFile = path.join(outputDir, `${targetDir.replace(/[\\/]/g, '_')}.md`);
fs.writeFileSync(outputFile, markdown, 'utf8');

console.log(`✅ Documentation successfully generated at: ${path.relative(root, outputFile)}`);
console.log(`Documented ${documentedFiles.length} file(s) with ${documentedFiles.reduce((acc, d) => acc + d.funcs.length, 0)} total method signatures.\n`);
