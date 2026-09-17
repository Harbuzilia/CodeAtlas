import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const homeDir = process.env.USERPROFILE || process.env.HOME || '';

console.log('--- 🔄 Multi-Target Environment Sync (OpenCode / Pi / OhMyPi / Agent Skills) ---\n');

const DEFAULT_SOURCES = ['skills', 'agents', 'command', 'context', 'plugin'];

// A target may narrow the synced dirs. The Agent Skills standard
// (agentskills.io) target carries ONLY skills — other harnesses reading
// ~/.agents/skills do not expect agents/commands/plugins there.
const targets = [
  { name: 'Local Project (.opencode)', dir: path.join(root, '.opencode') },
  { name: 'Global OpenCode (~/.config/opencode)', dir: path.join(homeDir, '.config', 'opencode') },
  { name: 'Global Pi (~/.config/pi)', dir: path.join(homeDir, '.config', 'pi') },
  { name: 'Global OhMyPi (~/.pi)', dir: path.join(homeDir, '.pi') },
  { name: 'Agent Skills Standard (~/.agents/skills)', dir: path.join(homeDir, '.agents', 'skills'), flatten: true }
];

for (const target of targets) {
  try {
    fs.mkdirSync(target.dir, { recursive: true });

    // The Agent Skills standard target IS the skills root itself:
    // skills/<name>/ -> ~/.agents/skills/<name>/ (no extra nesting).
    if (target.flatten) {
      const srcSkills = path.join(root, 'skills');
      let count = 0;
      if (fs.existsSync(srcSkills)) {
        for (const name of fs.readdirSync(srcSkills)) {
          const src = path.join(srcSkills, name);
          if (!fs.statSync(src).isDirectory()) continue;
          const dest = path.join(target.dir, name);
          if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) continue;
          fs.cpSync(src, dest, { recursive: true, force: true });
          count++;
        }
      }
      console.log(`✅ Synced to ${target.name} (${count} skills).`);
      continue;
    }

    let synced = 0;

    for (const sDir of target.sourceDirs ?? DEFAULT_SOURCES) {
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

    console.log(`✅ Synced to ${target.name} (${synced} modules updated).`);
  } catch (err) {
    console.warn(`⚠️ Could not sync to ${target.name}: ${err.message}`);
  }
}

console.log('\nMulti-target synchronization complete.\n');
