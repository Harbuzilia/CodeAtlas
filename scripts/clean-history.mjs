import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const historyDir = path.join(root, '.opencode', 'history');
const maxAgeDays = 14;
const now = Date.now();
const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

if (!fs.existsSync(historyDir)) {
  console.log('No .opencode/history directory found. Nothing to clean.');
  process.exit(0);
}

const entries = fs.readdirSync(historyDir, { withFileTypes: true });
let cleaned = 0;

for (const entry of entries) {
  const fullPath = path.join(historyDir, entry.name);
  try {
    const stats = fs.statSync(fullPath);
    const age = now - stats.mtimeMs;
    if (age > maxAgeMs) {
      if (entry.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      cleaned += 1;
      console.log(`Removed old history snapshot: ${entry.name}`);
    }
  } catch (err) {
    console.warn(`Could not process ${entry.name}: ${err.message}`);
  }
}

console.log(`Clean-history complete. Removed ${cleaned} expired snapshots (older than ${maxAgeDays} days).`);
