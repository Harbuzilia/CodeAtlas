#!/usr/bin/env node

/**
 * OpenCode Interactive Installer (Cross-Platform)
 * ================================================
 * Replaces opencode-init.sh and install-local.mjs with a single
 * interactive Node.js CLI that works on Windows, macOS, and Linux.
 *
 * Usage:
 *   node scripts/install.mjs              — Interactive mode
 *   node scripts/install.mjs --dry-run    — Preview without writing
 *   node scripts/install.mjs --target ./  — Non-interactive with target
 *
 * Inputs:  User prompts via @inquirer/prompts (or CLI flags)
 * Outputs: Copies OpenCode config into the target project directory.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { input, confirm } from '@inquirer/prompts';

// ─── Constants ───────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SOURCE_ROOT = path.resolve(__dirname, '..');

const VERSION = '2.0.0';

/** Core files to copy into .opencode/ root */
const CORE_FILES = [
  'opencode.json',
  'dcp.jsonc',
  'registry.json',
  'instructions.md',
  'PROJECT_GUIDE.md',
  'validate-runtime-governance.mjs',
];

/** Bundled tool files copied into target .opencode/ paths */
const BUNDLED_FILES = [
  {
    src: '.opencode/bin/ast-index.exe',
    dst: 'bin/ast-index.exe',
  },
];

/** Directories to recursively copy into .opencode/ */
const CORE_DIRS = ['agents', 'context', 'skills'];

/** Entries to add to .gitignore */
const GITIGNORE_ENTRIES = [
  '.opencode/task_state.md',
  '.opencode/lessons_learned.md',
  '.opencode/history/',
];

// ─── Style helpers ───────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';

/**
 * Prints a styled log message to stdout.
 * @param {string} prefix - Colored prefix tag (e.g. "COPY", "SKIP")
 * @param {string} msg    - Message body
 */
function log(prefix, msg) {
  console.log(`  ${prefix} ${msg}`);
}

const logCopy   = (m) => log(`${GREEN}✔ COPY${RESET}`, m);
const logSkip   = (m) => log(`${DIM}⊘ SKIP${RESET}`, m);
const logCreate = (m) => log(`${CYAN}✚ CREATE${RESET}`, m);
const logBackup = (m) => log(`${YELLOW}⤻ BACKUP${RESET}`, m);
const logDry    = (m) => log(`${DIM}⁃ DRY${RESET}`, m);
const logError  = (m) => log(`${RED}✖ ERROR${RESET}`, m);

// ─── CLI arg parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);

/**
 * Extracts a named CLI argument value from process.argv.
 * @param {string} name     - Argument name (without --)
 * @param {string|null} def - Default value if not found
 * @returns {string|null}
 */
function getArg(name, def = null) {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : def;
}

const DRY_RUN = args.includes('--dry-run');
const NON_INTERACTIVE = args.includes('--yes') || args.includes('-y');
const CLI_TARGET = getArg('target');

// ─── File system helpers ─────────────────────────────────────────────────────

/**
 * Recursively collects all file paths under a directory.
 * @param {string} dir - Absolute path to the directory
 * @returns {string[]} Array of absolute file paths
 */
function collectFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    try {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (entry.isFile()) {
          results.push(full);
        }
      }
    } catch (err) {
      logError(`Cannot read directory ${current}: ${err.message}`);
    }
  }
  return results;
}

/**
 * Copies a single file from src to dst, creating parent directories.
 * Respects DRY_RUN flag — prints action without writing.
 * @param {string} src      - Source file absolute path
 * @param {string} dst      - Destination file absolute path
 * @param {string} relLabel - Relative label for display
 * @returns {boolean} true if the file was actually copied
 */
function copyFile(src, dst, relLabel) {
  if (!fs.existsSync(src)) {
    logSkip(`missing source: ${relLabel}`);
    return false;
  }

  if (DRY_RUN) {
    logDry(relLabel);
    return false;
  }

  try {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    logCopy(relLabel);
    return true;
  } catch (err) {
    logError(`Failed to copy ${relLabel}: ${err.message}`);
    return false;
  }
}

/**
 * Creates a timestamped backup of a directory by renaming it.
 * @param {string} dirPath - Absolute path to the directory to backup
 * @returns {string|null}  - The backup path, or null on failure
 */
function backupDirectory(dirPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = `${dirPath}.bak_${timestamp}`;

  if (DRY_RUN) {
    logDry(`would backup → ${path.basename(backupPath)}`);
    return backupPath;
  }

  try {
    fs.renameSync(dirPath, backupPath);
    logBackup(`${path.basename(dirPath)} → ${path.basename(backupPath)}`);
    return backupPath;
  } catch (err) {
    logError(`Backup failed: ${err.message}`);
    return null;
  }
}

/**
 * Ensures specific lines exist in the target .gitignore file.
 * Creates the file if it doesn't exist.
 * @param {string} projectRoot - Absolute path to the project root
 * @param {string[]} entries   - Lines to ensure are present
 */
function patchGitignore(projectRoot, entries) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  let content = '';

  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf8');
  }

  const linesToAdd = entries.filter((entry) => !content.includes(entry));

  if (linesToAdd.length === 0) {
    logSkip('.gitignore already has OpenCode entries');
    return;
  }

  if (DRY_RUN) {
    logDry(`.gitignore: would add ${linesToAdd.length} entries`);
    return;
  }

  const block = '\n# OpenCode (auto-generated)\n' + linesToAdd.join('\n') + '\n';

  try {
    fs.appendFileSync(gitignorePath, block, 'utf8');
    logCreate(`.gitignore: added ${linesToAdd.length} entries`);
  } catch (err) {
    logError(`Failed to patch .gitignore: ${err.message}`);
  }
}

// ─── Main installer logic ────────────────────────────────────────────────────

/**
 * Main installer entry point. Orchestrates the full install flow:
 * 1. Welcome banner
 * 2. Target path prompt
 * 3. Backup existing config
 * 4. Copy core files and directories
 * 5. Patch .gitignore
 * 6. Run validation (if available)
 * 7. Print summary
 */
async function main() {
  // ── 1. Welcome ──
  console.log('');
  console.log(`${BOLD}${CYAN}  ╔══════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}  ║     OpenCode Installer v${VERSION}              ║${RESET}`);
  console.log(`${BOLD}${CYAN}  ║     Cross-platform agent configuration       ║${RESET}`);
  console.log(`${BOLD}${CYAN}  ╚══════════════════════════════════════════════╝${RESET}`);
  console.log('');

  if (DRY_RUN) {
    console.log(`  ${YELLOW}⚠ DRY RUN MODE — no files will be written${RESET}\n`);
  }

  // ── 2. Target path ──
  let targetRoot;

  if (CLI_TARGET) {
    targetRoot = path.resolve(CLI_TARGET);
  } else if (NON_INTERACTIVE) {
    targetRoot = process.cwd();
  } else {
    const answer = await input({
      message: 'Target project directory:',
      default: './',
      validate: (val) => {
        const resolved = path.resolve(val);
        if (!fs.existsSync(resolved)) {
          return `Directory does not exist: ${resolved}`;
        }
        return true;
      },
    });
    targetRoot = path.resolve(answer);
  }

  const opencodeDir = path.join(targetRoot, '.opencode');
  console.log(`\n  ${DIM}Source:${RESET}  ${SOURCE_ROOT}`);
  console.log(`  ${DIM}Target:${RESET}  ${opencodeDir}\n`);

  // ── 3. Backup existing ──
  if (fs.existsSync(opencodeDir)) {
    let shouldBackup = true;

    if (!NON_INTERACTIVE) {
      shouldBackup = await confirm({
        message: 'Existing .opencode/ found. Create a backup before overwriting?',
        default: true,
      });
    }

    if (shouldBackup) {
      const backupPath = backupDirectory(opencodeDir);
      if (!backupPath && !DRY_RUN) {
        logError('Backup failed. Aborting to prevent data loss.');
        process.exit(1);
      }
    }
  }

  // ── 4. Copy core files ──
  console.log(`\n  ${BOLD}Copying core files...${RESET}`);
  let copied = 0;
  let skipped = 0;

  for (const file of CORE_FILES) {
    const src = path.join(SOURCE_ROOT, file);
    const dst = path.join(opencodeDir, file);
    if (copyFile(src, dst, file)) {
      copied++;
    } else {
      skipped++;
    }
  }

  // ── 5. Copy directories ──
  console.log(`\n  ${BOLD}Copying directories...${RESET}`);

  for (const dir of CORE_DIRS) {
    const srcDir = path.join(SOURCE_ROOT, dir);
    const files = collectFiles(srcDir);

    if (files.length === 0) {
      logSkip(`${dir}/ (empty or missing)`);
      skipped++;
      continue;
    }

    for (const absFile of files) {
      const relToSource = path.relative(SOURCE_ROOT, absFile);
      const dst = path.join(opencodeDir, relToSource);
      if (copyFile(absFile, dst, relToSource)) {
        copied++;
      } else {
        skipped++;
      }
    }
  }

  console.log(`\n  ${BOLD}Copying bundled tools...${RESET}`);

  for (const file of BUNDLED_FILES) {
    const src = path.join(SOURCE_ROOT, file.src);
    const dst = path.join(opencodeDir, file.dst);
    if (copyFile(src, dst, file.dst)) {
      copied++;
    } else {
      skipped++;
    }
  }

  // ── 6. Patch .gitignore ──
  console.log(`\n  ${BOLD}Patching .gitignore...${RESET}`);
  patchGitignore(targetRoot, GITIGNORE_ENTRIES);

  // ── 7. Post-install validation ──
  const validatorPath = path.join(opencodeDir, 'validate-runtime-governance.mjs');
  if (fs.existsSync(validatorPath) && !DRY_RUN) {
    console.log(`\n  ${BOLD}Running post-install validation...${RESET}`);
    try {
      const { execSync } = await import('node:child_process');
      execSync(`node "${validatorPath}"`, {
        cwd: opencodeDir,
        stdio: 'inherit',
        timeout: 30000,
      });
    } catch {
      console.log(`  ${YELLOW}⚠ Validation had warnings (non-fatal)${RESET}`);
    }
  }

  // ── 8. Summary ──
  console.log('');
  console.log(`${BOLD}${GREEN}  ╔══════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${GREEN}  ║     ✔ Installation complete!                 ║${RESET}`);
  console.log(`${BOLD}${GREEN}  ╚══════════════════════════════════════════════╝${RESET}`);
  console.log('');
  console.log(`  ${DIM}Files copied:${RESET}  ${copied}`);
  console.log(`  ${DIM}Files skipped:${RESET} ${skipped}`);
  console.log(`  ${DIM}Location:${RESET}      ${opencodeDir}`);
  console.log('');
  console.log(`  ${CYAN}Next steps:${RESET}`);
  console.log(`  1. Review ${BOLD}.opencode/opencode.json${RESET} and set your model/API keys`);
  console.log(`  2. Run ${BOLD}node .opencode/validate-runtime-governance.mjs${RESET} to verify`);
  console.log(`  3. Start coding with OpenCode! 🚀`);
  console.log('');
}

// ─── Entry ───────────────────────────────────────────────────────────────────

main().catch((err) => {
  if (err.name === 'ExitPromptError') {
    console.log(`\n  ${DIM}Installation cancelled by user.${RESET}\n`);
    process.exit(0);
  }
  logError(err.message);
  process.exit(1);
});
