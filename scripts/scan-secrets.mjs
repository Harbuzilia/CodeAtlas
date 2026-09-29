import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

console.log('====================================================');
console.log('       🔒 OPENCODE SECURITY SECRET SCANNER          ');
console.log('====================================================\n');

const secretPatterns = [
  { name: 'OpenAI API Key', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Google API Key', regex: /\bAIzaSy[A-Za-z0-9_-]{33}\b/ },
  { name: 'AWS Access Key ID', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Stripe Secret Key', regex: /\bsk_live_[0-9a-zA-Z]{24,}\b/ },
  { name: 'GitHub Personal Access Token', regex: /\bghp_[0-9a-zA-Z]{36}\b/ },
  { name: 'RSA/SSH Private Key', regex: /-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/ },
  { name: 'Database Connection String with Password', regex: /(postgres|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@[^\s]+/i },
  { name: 'JWT Token in Code', regex: /\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/ }
];

const ignoreDirs = new Set(['node_modules', '.git', '.tmp', '.opencode', 'dist', 'build', '.githooks']);
const targetExts = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.cs', '.py', '.json', '.env', '.yaml', '.yml', '.md']);

const filesToScan = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        walk(path.join(dir, entry.name));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (targetExts.has(ext) || entry.name.startsWith('.env')) {
        filesToScan.push(path.join(dir, entry.name));
      }
    }
  }
}

walk(root);

let leaksFound = 0;

for (const file of filesToScan) {
  const relPath = path.relative(root, file).replace(/\\/g, '/');
  // Skip test fixtures or scan scripts that contain regex definitions
  if (relPath.includes('scan-secrets.mjs') || relPath.includes('security-sast')) continue;

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of secretPatterns) {
      if (pattern.regex.test(line)) {
        console.error(`🚨 [LEAK DETECTED] ${pattern.name}`);
        console.error(`   File: ${relPath}:${i + 1}`);
        console.error(`   Snippet: ${line.trim().slice(0, 80)}...\n`);
        leaksFound++;
      }
    }
  }
}

console.log(`Scanned ${filesToScan.length} files for secrets and API credentials.`);

if (leaksFound > 0) {
  console.error(`\n❌ FAILED: Found ${leaksFound} potential secret leak(s).`);
  console.error('Please remove or replace secrets with environment variables before committing!');
  process.exit(1);
} else {
  console.log('✅ Clean: No leaked credentials or secrets found.\n');
  console.log('====================================================\n');
}
