import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const isWindows = process.platform === 'win32';
const mode = process.argv.includes('--update') ? 'update' : 'rebuild';

const localBin = path.join(root, '.opencode', 'bin', isWindows ? 'ast-index.exe' : 'ast-index');
const homeDir = process.env.USERPROFILE || process.env.HOME || '';
const globalBin = path.join(homeDir, '.config', 'opencode', 'bin', isWindows ? 'ast-index.exe' : 'ast-index');

let targetBin = null;
if (fs.existsSync(localBin)) targetBin = localBin;
else if (fs.existsSync(globalBin)) targetBin = globalBin;

if (!targetBin) {
  console.warn('ast-index binary not found in .opencode/bin or ~/.config/opencode/bin.');
  console.log('Skipping ast-index operation.');
  process.exit(0);
}

console.log(`Running ast-index ${mode} via ${targetBin}...`);
const res = spawnSync(targetBin, [mode], { cwd: root, stdio: 'inherit', shell: isWindows });

if (res.status === 0) {
  console.log(`OK: ast-index ${mode} completed successfully.`);
} else {
  console.error(`ast-index ${mode} failed with exit code ${res.status}`);
  process.exit(res.status || 1);
}
