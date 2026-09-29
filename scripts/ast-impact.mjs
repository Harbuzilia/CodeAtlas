#!/usr/bin/env node
// AST Impact — blast-radius radar on top of the REAL ast-index CLI (3.55+).
// Pipeline per changed file: git diff hunks -> symbols whose line range
// intersects a hunk (ast-index outline, tree-sitter/SQLite) -> every caller of
// each changed symbol (ast-index usages, JSON schema v2 with pagination).
// Unlike the pre-wave-12 regex prototype, symbol boundaries and usage counts
// come from the indexed AST, not word-boundary grep.
// Exit 0 when the binary or the project index is absent (graceful skip, same
// policy as ast-rebuild); exit 1 on real invocation failures.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.cs', '.py', '.go', '.rs', '.vue', '.svelte']);
const MAX_FILES = 40;
const MAX_SYMBOLS_PER_FILE = 25;
const USAGES_LIMIT = 100;

export function findBinary(cwd = process.cwd()) {
  const candidates = [
    path.join(cwd, '.opencode', 'bin', 'ast-index.exe'),
    path.join(cwd, '.opencode', 'bin', 'ast-index'),
    path.join(os.homedir(), '.config', 'opencode', 'bin', 'ast-index.exe'),
    path.join(os.homedir(), '.config', 'opencode', 'bin', 'ast-index'),
    path.join(process.env.LOCALAPPDATA ?? '', 'ast-index', 'ast-index.exe'),
  ];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) ?? null;
}

function run(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  return { code: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function parseJson(stdout) {
  try {
    return JSON.parse(String(stdout ?? '').trim());
  } catch {
    return null;
  }
}

/** schema v2 {items, pagination} or v1 bare array -> {items, truncated, total}. */
export function parseListPayload(payload) {
  if (Array.isArray(payload)) return { items: payload, truncated: false, total: payload.length };
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return {
    items,
    truncated: Boolean(payload?.pagination?.truncated),
    total: payload?.pagination?.total ?? items.length,
  };
}

/** outline payload (json) or text fallback -> [{line, name}] (definition order). */
export function parseOutline(payload, text) {
  if (payload && typeof payload === 'object') {
    const list = Array.isArray(payload.symbols)
      ? payload.symbols
      : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];
    const symbols = list
      .map((s) => ({
        line: Number(s.line ?? s.start_line ?? s.startLine ?? 0),
        name: String(s.name ?? s.symbol ?? ''),
      }))
      .filter((s) => s.name && s.line > 0);
    if (symbols.length) return symbols;
  }
  const symbols = [];
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const match = /^\s*:(\d+)\s+([A-Za-z_$][\w$.]*)/.exec(line);
    if (match) symbols.push({ line: Number(match[1]), name: match[2] });
  }
  return symbols;
}

/** `git diff -U0` text -> Map(file -> [[startLine, lineCount], ...]). */
export function parseDiffHunks(diffText) {
  const ranges = new Map();
  let current = null;
  for (const line of String(diffText ?? '').split(/\r?\n/)) {
    if (line.startsWith('+++ b/')) {
      current = line.slice(6);
      if (!ranges.has(current)) ranges.set(current, []);
      continue;
    }
    const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (match && current) {
      ranges.get(current).push([Number(match[1]), match[2] === undefined ? 1 : Number(match[2])]);
    }
  }
  return ranges;
}

/** Symbols whose [line, nextSymbolLine) range intersects any hunk of the file. */
export function changedSymbols(symbols, hunks) {
  const sorted = [...symbols].sort((a, b) => a.line - b.line);
  const out = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const start = sorted[i].line;
    const end = i + 1 < sorted.length ? sorted[i + 1].line : Number.MAX_SAFE_INTEGER;
    const touched = (hunks ?? []).some(([hunkStart, hunkCount]) => {
      const hunkEnd = hunkStart + Math.max(hunkCount, 1);
      return hunkStart < end && hunkEnd > start;
    });
    if (touched) out.push(sorted[i]);
  }
  return out;
}

function usageFiles(items) {
  const files = new Set();
  for (const item of items) {
    const file = item?.path ?? item?.file ?? item?.location?.path ?? item?.file_path;
    if (typeof file === 'string' && file) files.add(file);
  }
  return files;
}

export async function main(argv = process.argv.slice(2)) {
  const baseIndex = argv.indexOf('--base');
  const base = baseIndex >= 0 ? argv[baseIndex + 1] : 'HEAD';

  const diff = spawnSync('git', ['diff', '-U0', base], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const diffText = diff.stdout ?? '';
  const hunksByFile = parseDiffHunks(diffText);
  const files = [...hunksByFile.keys()]
    .filter((file) => CODE_EXTENSIONS.has(path.extname(file)))
    .slice(0, MAX_FILES);
  if (files.length === 0) {
    console.log('AST Impact: no changed code files against', base);
    return 0;
  }

  const binary = findBinary();
  if (!binary) {
    console.log('AST Impact: ast-index binary not found — skipped (install via winget defendend.ast-index or drop ast-index.exe into ~/.config/opencode/bin).');
    return 0;
  }

  let indexMissing = false;
  let failures = 0;
  let reported = 0;
  console.log(`AST Impact: base=${base} files=${files.length} (ast-index ${run(binary, ['--version']).stdout.trim()})`);

  for (const file of files) {
    const outline = run(binary, ['outline', file, '--format', 'json']);
    if (outline.code !== 0) {
      if (/no index|index not found|rebuild/i.test(outline.stderr)) {
        indexMissing = true;
        break;
      }
      failures += 1;
      continue;
    }
    const symbols = parseOutline(parseJson(outline.stdout), outline.stdout);
    const touched = changedSymbols(symbols, hunksByFile.get(file)).slice(0, MAX_SYMBOLS_PER_FILE);
    for (const symbol of touched) {
      const usages = run(binary, ['usages', symbol.name, '--format', 'json', '-l', String(USAGES_LIMIT)]);
      if (usages.code !== 0) {
        failures += 1;
        continue;
      }
      const list = parseListPayload(parseJson(usages.stdout));
      const callers = usageFiles(list.items);
      reported += 1;
      console.log(
        `  ${symbol.name} (${file}:${symbol.line}) -> ${list.total} usages in ${callers.size} files${list.truncated ? ' [TRUNCATED: raise -l]' : ''}`,
      );
    }
  }

  if (indexMissing) {
    console.log('AST Impact: no ast-index index for this project — run `npm run ast:rebuild` first. Skipped.');
    return 0;
  }
  if (failures > 0) {
    console.error(`AST Impact: ${failures} ast-index invocation(s) failed`);
    return 1;
  }
  console.log(reported === 0 ? 'AST Impact: changed symbols have no tracked usages — blast radius empty.' : `AST Impact: ${reported} changed symbol(s) analysed.`);
  return 0;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
if (invoked) {
  main().then((code) => { process.exitCode = code; });
}
