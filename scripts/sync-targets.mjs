import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const homeDir = process.env.USERPROFILE || process.env.HOME || '';

console.log('--- 🔄 Multi-Target Environment Sync (OpenCode / Pi / OhMyPi) ---\n');

const targets = [
  { name: 'Local Project (.opencode)', dir: path.join(root, '.opencode') },
  { name: 'Global OpenCode (~/.config/opencode)', dir: path.join(homeDir, '.config', 'opencode') },
  { name: 'Global Pi (~/.config/pi)', dir: path.join(homeDir, '.config', 'pi') },
  { name: 'Global OhMyPi (~/.pi)', dir: path.join(homeDir, '.pi') }
];

const sourceDirs = ['skills', 'agents', 'command', 'context', 'plugin'];
const extraSyncs = [{ src: '.opencode/plugin', dest: '.opencode/plugin' }];

for (const target of targets) {
  try {
    fs.mkdirSync(target.dir, { recursive: true });
    let synced = 0;

    for (const sDir of sourceDirs) {
      const srcPath = path.join(root, sDir);
      const destPath = path.join(target.dir, sDir);

      if (fs.existsSync(srcPath)) {
        if (fs.existsSync(destPath)) {
          const lstat = fs.lstatSync(destPath);
          if (lstat.isSymbolicLink()) {
            synced++;
            continue;
          }
        }
        fs.cpSync(srcPath, destPath, { recursive: true, force: true });
        synced++;
      }
    }
    for (const { src, dest } of extraSyncs) {
      const srcPath = path.join(root, src);
      const destPath = path.join(target.dir, dest);
      if (fs.existsSync(srcPath)) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.cpSync(srcPath, destPath, { recursive: true, force: true });
        synced++;
      }
    }

    console.log(`✅ Synced to ${target.name} (${synced} modules updated).`);
  } catch (err) {
    console.warn(`⚠️ Could not sync to ${target.name}: ${err.message}`);
  }
}

console.log('\nMulti-target synchronization complete.\n');
