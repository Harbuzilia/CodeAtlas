import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const opencodeDir = path.join(root, '.opencode');
const repomapFile = path.join(opencodeDir, 'repomap.txt');

fs.mkdirSync(opencodeDir, { recursive: true });

console.log('Generating Repository Map via Aider Tree-sitter...');

const isWindows = process.platform === 'win32';
const env = {
  ...process.env,
  PROMPT_TOOLKIT_NO_CPR: '1',
  PYTHONIOENCODING: 'utf-8'
};

const cmd = 'uvx';
const args = [
  '--from',
  'aider-chat',
  'aider',
  '--yes',
  '--no-auto-commits',
  '--model',
  'null',
  '--no-show-model-warnings',
  '--show-repo-map'
];

const child = spawn(cmd, args, {
  cwd: root,
  env,
  shell: isWindows,
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdoutData = '';
let stderrData = '';

child.stdout.on('data', (d) => { stdoutData += d.toString(); });
child.stderr.on('data', (d) => { stderrData += d.toString(); });

child.on('close', (code) => {
  if (code === 0 && stdoutData.trim().length > 0) {
    fs.writeFileSync(repomapFile, stdoutData, 'utf8');
    console.log(`OK: Repository map written to .opencode/repomap.txt (${stdoutData.length} bytes)`);
  } else {
    console.warn(`Aider process exited with code ${code}.`);
    if (stderrData) console.warn(stderrData);
    if (!fs.existsSync(repomapFile)) {
      fs.writeFileSync(repomapFile, `# Repository Map (Generated: ${new Date().toISOString()})\n`, 'utf8');
      console.log('Created placeholder .opencode/repomap.txt');
    }
  }
});
