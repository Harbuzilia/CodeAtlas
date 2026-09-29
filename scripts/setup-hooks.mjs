import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gitDir = path.join(root, '.git');
const hooksDir = path.join(root, '.githooks');

if (!fs.existsSync(gitDir)) {
  console.log('No .git directory found. Skipping hook setup.');
  process.exit(0);
}

fs.mkdirSync(hooksDir, { recursive: true });

try {
  execSync('git config core.hooksPath .githooks', { cwd: root, stdio: 'inherit' });
  console.log('OK: Configured git core.hooksPath to .githooks');
} catch (err) {
  console.warn(`Could not set core.hooksPath: ${err.message}`);
}
