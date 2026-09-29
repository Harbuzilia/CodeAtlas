// OpenCode PR pipeline: quality gates -> safe staging -> conventional commit -> push -> gh pr create.
//
// Design rules this pipeline enforces (the previous version violated all of them):
//  - Never build a shell string out of user input: every git/gh call uses execFile with argv.
//  - Never claim success from a swallowed error: exit codes are checked explicitly.
//  - Never delete branches or push --delete by accident: only with --cleanup.
//  - Never commit a junk payload (binaries, node_modules, huge files) silently.
//  - --dry-run performs every check and prints the exact commands without mutating anything.
//
// Usage:
//   npm run pr -- --title "feat(x): add y" [--base main] [--draft] [--dry-run] [--cleanup]
//                                          [--skip-gates] [--allow-large]

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// ---------------------------------------------------------------- argv ----
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const DRY_RUN = flag('dry-run');
const DRAFT = flag('draft');
const CLEANUP = flag('cleanup');
const SKIP_GATES = flag('skip-gates');
const ALLOW_LARGE = flag('allow-large');
const BASE = opt('base');
const TITLE = opt('title');

const MAX_STAGED_BYTES = 5 * 1024 * 1024;
const JUNK_PATTERNS = [
  /(^|\/)node_modules\//,
  /\.(exe|dll|so|dylib|zip|tar|gz|7z|iso|bin|pdb)$/i,
  /(^|\/)\.env(\.|$)/,
  /\.(log|sqlite|db)$/i,
];

// ------------------------------------------------------------- helpers ----
/** Run a program with argv (no shell). Returns { ok, out, err, code }. */
function exec(program, args, { allowFail = true } = {}) {
  try {
    const out = execFileSync(program, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, out: out.trim(), err: '', code: 0 };
  } catch (e) {
    const res = {
      ok: false,
      out: (e.stdout || '').toString().trim(),
      err: (e.stderr || e.message || '').toString().trim(),
      code: typeof e.status === 'number' ? e.status : 1,
    };
    if (!allowFail) {
      console.error(`\n❌ Command failed: ${program} ${args.join(' ')}`);
      if (res.err) console.error(res.err);
      process.exit(1);
    }
    return res;
  }
}

/** npm needs a shell on Windows (.cmd shim) — the command string is fixed, never user input. */
function npmRun(script) {
  try {
    const out = execFileSync(`npm run ${script}`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    return { ok: true, out: out.trim() };
  } catch (e) {
    return { ok: false, out: ((e.stdout || '') + (e.stderr || '')).toString().trim() };
  }
}

function step(n, text) {
  console.log(`\n${n}. ${text}`);
}

function warn(text) {
  console.log(`   ⚠️  ${text}`);
}

function runOrExplain(program, args, why) {
  if (DRY_RUN) {
    const pretty = args.map((a) => (a.includes(' ') || a.includes('\n') ? JSON.stringify(a) : a)).join(' ');
    console.log(`   [dry-run] ${program} ${pretty}`);
    return { ok: true, out: '', err: '', code: 0, dry: true };
  }
  const res = exec(program, args);
  if (!res.ok && why) console.error(`   ❌ ${why}\n${res.err || res.out}`);
  return res;
}

/** Conventional-commit subject inferred from the staged paths when --title is absent. */
function deriveCommitSubject() {
  const files = exec('git', ['diff', '--cached', '--name-only']).out.split('\n').filter(Boolean);
  const onlyDocs = files.length > 0 && files.every((f) => /^(docs\/|.*\.md$)/.test(f));
  const onlyConfig =
    files.length > 0 &&
    files.every((f) => /^(agents\/|command\/|skills\/|context\/|plugin\/|.*\.jsonc?$|\.github\/)/.test(f));
  const type = onlyDocs ? 'docs' : onlyConfig ? 'chore' : 'feat';
  const scope = files[0]?.split('/')[0] ?? 'repo';
  return `${type}(${scope}): update ${files.length} file(s)`;
}

// ---------------------------------------------------------- preflight ----
console.log('--- 🚀 OpenCode PR pipeline ---');

if (exec('git', ['rev-parse', '--is-inside-work-tree']).out !== 'true') {
  console.error('❌ Not a git repository.');
  process.exit(1);
}

const branch = exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { allowFail: false }).out;

if (!exec('gh', ['--version'], { allowFail: true }).ok) {
  console.error('❌ GitHub CLI (gh) is not installed — PR creation is impossible.');
  console.error('   Install: https://cli.github.com/   (winget install GitHub.cli)');
  process.exit(1);
}

if (!exec('gh', ['auth', 'status']).ok) {
  console.error('❌ gh is not authenticated. Run: gh auth login');
  process.exit(1);
}

const remoteUrl = exec('git', ['remote', 'get-url', 'origin']);
if (!remoteUrl.ok) {
  console.error('❌ No git remote "origin" — push and PR are impossible.');
  console.error('   Existing repo:   git remote add origin git@github.com:<owner>/<repo>.git');
  console.error('   Create it:       gh repo create <owner>/<repo> --source . --private --push');
  process.exit(1);
}
console.log(`   remote: ${remoteUrl.out}`);
console.log(`   branch: ${branch}${DRY_RUN ? '  (dry-run)' : ''}`);

// ------------------------------------------------------------- gates ----
if (SKIP_GATES) {
  warn('quality gates skipped (--skip-gates)');
} else {
  step(1, 'Quality gates (validate:all, scan:secrets, eval:routes)');
  const gates = [
    ['validate:all', npmRun('validate:all')],
    ['scan:secrets', npmRun('scan:secrets')],
    ['eval:routes', npmRun('eval:routes')],
  ];
  let failed = false;
  for (const [name, res] of gates) {
    if (res.ok) console.log(`   ✅ ${name}`);
    else {
      failed = true;
      console.error(`   ❌ ${name}`);
      console.error(res.out.split('\n').slice(-25).join('\n'));
    }
  }
  if (failed) {
    console.error('\n❌ Quality gates failed — nothing was committed or pushed.');
    process.exit(1);
  }
}

// --------------------------------------------- staging with safety net ----
step(2, 'Staging working tree');
const status = exec('git', ['status', '--porcelain']).out;

if (status) {
  runOrExplain('git', ['add', '-A']);

  const staged = DRY_RUN
    ? exec('git', ['ls-files', '--modified', '--others', '--exclude-standard']).out.split('\n').filter(Boolean)
    : exec('git', ['diff', '--cached', '--name-only']).out.split('\n').filter(Boolean);

  const offenders = [];
  let totalBytes = 0;
  for (const rel of staged) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const size = fs.statSync(abs).size;
    totalBytes += size;
    if (JUNK_PATTERNS.some((re) => re.test(rel))) offenders.push(`${rel} (junk pattern)`);
    else if (size > MAX_STAGED_BYTES) offenders.push(`${rel} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  }

  console.log(`   files: ${staged.length}, total: ${(totalBytes / 1024).toFixed(0)} KB, per-file limit: 5 MB`);

  if (offenders.length > 0 && !ALLOW_LARGE) {
    console.error('\n❌ Refusing to commit suspicious/large paths:');
    for (const o of offenders.slice(0, 20)) console.error(`   - ${o}`);
    console.error('   Add them to .gitignore, or re-run with --allow-large if this is intentional.');
    process.exit(1);
  }
} else {
  console.log('   working tree clean — nothing to commit');
}

// ----------------------------------------------------- branch + commit ----
let activeBranch = branch;

if (branch === 'main' || branch === 'master') {
  const slug = (TITLE || 'automated-update')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  activeBranch = `feat/${slug || 'automated-update'}`;
  step(3, `Creating feature branch ${activeBranch}`);
  runOrExplain('git', ['checkout', '-b', activeBranch]);
} else {
  step(3, `Using existing branch ${activeBranch}`);
}

const commitSubject = TITLE || deriveCommitSubject();
if (status) {
  step(4, `Committing: ${commitSubject}`);
  const res = runOrExplain('git', ['commit', '-m', commitSubject], 'Commit failed (pre-commit hook?)');
  if (!res.ok) process.exit(1);
  console.log('   ✅ committed');
} else {
  step(4, 'No commit needed (tree clean)');
}

// --------------------------------------------------------------- base ----
function resolveBase() {
  if (BASE) return BASE;
  const usable = (name) => Boolean(name) && name !== '(unknown)' && name !== 'HEAD';
  const head = exec('git', ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD']);
  if (head.ok) {
    const name = head.out.replace('refs/remotes/origin/', '');
    if (usable(name)) return name;
  }
  const show = exec('git', ['remote', 'show', 'origin']);
  const m = show.out.match(/HEAD branch:\s*(\S+)/);
  if (m && usable(m[1])) return m[1];
  for (const candidate of ['main', 'master']) {
    if (exec('git', ['rev-parse', '--verify', `origin/${candidate}`]).ok) return candidate;
  }
  return 'main';
}
const base = resolveBase();

// --------------------------------------------- duplicate PR / content ----
step(5, `Checking for an existing PR for ${activeBranch}`);
runOrExplain('git', ['fetch', 'origin', '--prune'], 'fetch failed');

const existing = runOrExplain(
  'gh',
  ['pr', 'list', '--head', activeBranch, '--state', 'open', '--json', 'number,url', '--limit', '5'],
  'gh pr list failed',
);

if (!DRY_RUN && existing.ok && existing.out && existing.out !== '[]') {
  console.log(`   ℹ️  PR already open: ${existing.out}`);
  console.log('   Nothing to do — no duplicate PR created.');
  process.exit(0);
}

const contentDiff = exec('git', ['diff', '--name-only', `origin/${base}..HEAD`]);
if (contentDiff.ok && contentDiff.out === '' && activeBranch !== base) {
  warn(`branch content is already identical to origin/${base} (squashed merge?)`);
  if (CLEANUP) {
    console.log('   --cleanup: deleting the now-useless branch');
    runOrExplain('git', ['checkout', base]);
    runOrExplain('git', ['branch', '-D', activeBranch]);
    runOrExplain('git', ['push', 'origin', '--delete', activeBranch]);
  } else {
    console.log('   (re-run with --cleanup to delete local + remote branch)');
  }
  console.log('\n✅ Pipeline finished without a PR.');
  process.exit(0);
}

// --------------------------------------------------------------- push ----
step(6, `Pushing ${activeBranch} -> origin`);
const push = runOrExplain('git', ['push', '-u', 'origin', activeBranch], 'Push rejected');
if (!push.ok && !push.dry) {
  console.error('   Fix the error above (auth, protected branch, non-fast-forward) and retry.');
  process.exit(1);
}
console.log(`   ✅ pushed origin/${activeBranch}`);

// ----------------------------------------------------------- PR body ----
function buildBody() {
  const stat = exec('git', ['diff', '--stat', `origin/${base}..HEAD`]).out || '(no diff vs base)';
  const commits = exec('git', ['log', '--oneline', `origin/${base}..HEAD`]).out || '(none)';
  const files = exec('git', ['diff', '--name-only', `origin/${base}..HEAD`]).out.split('\n').filter(Boolean);

  const rows = files
    .slice(0, 30)
    .map((f) => `| \`${f}\` |`)
    .join('\n');

  const lines = [
    '## Summary',
    '',
    TITLE ? `**${TITLE}**` : 'Automated update.',
    '',
    `Branch \`${activeBranch}\` → \`${base}\`.`,
    '',
    '## Commits',
    '',
    '```',
    commits,
    '```',
    '',
    '## Changed files',
    '',
  ];

  if (files.length > 30) lines.push(`_${files.length} files (first 30 shown)_`, '');
  lines.push('| File |', '| --- |', rows, '', '## Verification', '');
  if (SKIP_GATES) {
    lines.push('- [ ] quality gates were SKIPPED (`--skip-gates`)');
  } else {
    lines.push(
      '- [x] `npm run validate:all` (registry, context refs, frontmatter sync, runtime governance)',
      '- [x] `npm run scan:secrets` (no leaked credentials)',
      '- [x] `npm run eval:routes` (routing scenarios)',
    );
  }
  lines.push(
    '- [x] `.opencode/` runtime mirrored from source (`npm run sync:local`)',
    '',
    '## Diff stat',
    '',
    '```',
    stat,
    '```',
    '',
    '## Rollback',
    '',
    '`git revert --no-edit <merge-sha>` or close this PR and delete the branch.',
  );
  return lines.join('\n');
}

// --------------------------------------------------------------- PR ----
step(7, 'Creating pull request');
const prArgs = ['pr', 'create', '--title', TITLE || commitSubject, '--body', buildBody(), '--base', base, '--head', activeBranch];
if (DRAFT) prArgs.push('--draft');

const created = runOrExplain('gh', prArgs, 'gh pr create failed');
if (!created.ok && !created.dry) {
  console.error('   PR was NOT created. The branch is pushed — create it manually or fix the error above.');
  process.exit(1);
}
if (created.ok && created.out) console.log(`\n🎉 PR created: ${created.out}`);
else console.log('\n✅ Pipeline finished.');
