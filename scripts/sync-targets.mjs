// Multi-target sync: push the source-of-truth catalogs into runtime homes.
//
// Targets write OUTSIDE the repo (~/.config/opencode, ~/.config/pi, ~/.pi), so
// the run is explicit and inspectable:
//   node scripts/sync-targets.mjs                 # sync default targets
//   node scripts/sync-targets.mjs --dry-run       # show what would change
//   node scripts/sync-targets.mjs --only=opencode # only targets matching substring
//   node scripts/sync-targets.mjs --with-agents-skills   # include ~/.agents/skills
// CODE_ATLAS_SYNC_AGENTS_SKILLS=1 does the same as the flag. The Agent Skills
// standard dir is opt-in because it is SHARED with other tools on the machine
// (Orca and friends keep their skills there too) — mixing catalogs surprises
// every harness that reads it.
//
// Note: config changes need an opencode restart to take effect; registry.json
// and config/ stay repo-scoped on purpose (scripts run from the repo).

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const homeDir = process.env.USERPROFILE || process.env.HOME || '';
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY = (args.find((a) => a.startsWith('--only=')) ?? '').slice('--only='.length);
const WITH_AGENTS_SKILLS =
  args.includes('--with-agents-skills') || process.env.CODE_ATLAS_SYNC_AGENTS_SKILLS === '1';

console.log('--- 🔄 Multi-Target Environment Sync (OpenCode / Pi / OhMyPi / Agent Skills) ---\n');
if (DRY_RUN) console.log('(dry-run: nothing will be written)\n');

const DEFAULT_SOURCES = ['skills', 'agents', 'command', 'context', 'plugin'];

const targets = [
  { name: 'Local Project (.opencode)', dir: path.join(root, '.opencode') },
  // Global opencode auto-loads AGENTS.md from its config dir, so the portable
  // entry point travels with the catalogs (instructions.md/registry.json stay
  // repo-scoped: they need project config wiring / script cwd).
  { name: 'Global OpenCode (~/.config/opencode)', dir: path.join(homeDir, '.config', 'opencode'), files: ['AGENTS.md'] },
  { name: 'Global Pi (~/.config/pi)', dir: path.join(homeDir, '.config', 'pi') },
  { name: 'Global OhMyPi (~/.pi)', dir: path.join(homeDir, '.pi') },
  { name: 'Agent Skills Standard (~/.agents/skills)', dir: path.join(homeDir, '.agents', 'skills'), flatten: true, optIn: true }
];

for (const target of targets) {
  if (ONLY && !target.name.toLowerCase().includes(ONLY.toLowerCase())) continue;
  if (target.optIn && !WITH_AGENTS_SKILLS) {
    console.log(`⏭️  Skipped ${target.name} (opt-in: --with-agents-skills or CODE_ATLAS_SYNC_AGENTS_SKILLS=1)`);
    continue;
  }
  try {
    if (!DRY_RUN) fs.mkdirSync(target.dir, { recursive: true });

    // Flattened skills root: skills/<name>/ -> <target>/<name>/
    if (target.flatten) {
      const srcSkills = path.join(root, 'skills');
      let count = 0;
      if (fs.existsSync(srcSkills)) {
        for (const name of fs.readdirSync(srcSkills)) {
          const src = path.join(srcSkills, name);
          if (!fs.statSync(src).isDirectory()) continue;
          const dest = path.join(target.dir, name);
          if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) continue;
          if (!DRY_RUN) fs.cpSync(src, dest, { recursive: true, force: true });
          count++;
        }
      }
      console.log(`${DRY_RUN ? '[dry-run] would sync' : '✅ Synced to'} ${target.name} (${count} skills).`);
      continue;
    }

    let synced = 0;

    for (const sDir of target.sourceDirs ?? DEFAULT_SOURCES) {
      const srcPath = path.join(root, sDir);
      const destPath = path.join(target.dir, sDir);

      if (fs.existsSync(srcPath)) {
        if (fs.existsSync(destPath) && fs.lstatSync(destPath).isSymbolicLink()) {
          synced++;
          continue;
        }
        if (!DRY_RUN) fs.cpSync(srcPath, destPath, { recursive: true, force: true });
        synced++;
      }
    }

    // Extra single files (e.g. the portable AGENTS.md entry point).
    for (const rel of target.files ?? []) {
      const src = path.join(root, rel);
      if (!fs.existsSync(src)) continue;
      if (!DRY_RUN) fs.copyFileSync(src, path.join(target.dir, rel));
      synced++;
    }

    console.log(`${DRY_RUN ? '[dry-run] would sync' : '✅ Synced to'} ${target.name} (${synced} modules updated).`);
  } catch (err) {
    console.warn(`⚠️ Could not sync to ${target.name}: ${err.message}`);
  }
}

console.log('\nMulti-target synchronization complete. Restart opencode to pick up changes.\n');
