// Portable test entry point.
//
// `node --test` with no path discovers far too much (it picked up zod's own
// tests under .opencode/node_modules and `scripts/test-*.mjs`, reporting 32
// unrelated tests), while `node --test tests` fails on Node >= 22 because a bare
// directory argument is no longer accepted. So: discover the files ourselves and
// hand node an explicit list — same behaviour on Node 20 (CI) and Node 26.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const testsDir = path.join(root, 'tests');

if (!fs.existsSync(testsDir)) {
  console.log('No tests/ directory — nothing to run.');
  process.exit(0);
}

const files = [];
const stack = [testsDir];
while (stack.length > 0) {
  const current = stack.pop();
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const abs = path.join(current, entry.name);
    if (entry.isDirectory()) stack.push(abs);
    else if (entry.isFile() && /\.test\.m?js$/.test(entry.name)) files.push(abs);
  }
}
files.sort();

if (files.length === 0) {
  console.log('No *.test.mjs files found under tests/ — nothing to run.');
  process.exit(0);
}

console.log(`Running ${files.length} test file(s):`);
for (const f of files) console.log(`  ${path.relative(root, f)}`);

const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
process.exit(typeof result.status === 'number' ? result.status : 1);
