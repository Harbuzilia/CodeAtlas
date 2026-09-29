#!/usr/bin/env node
// bench-coordinator.mjs — measures coordinator model candidates on fixed
// scenarios through the REAL opencode 2.x runtime (standalone runs against the
// live global config, so real provider keys apply). Emits a markdown table:
// wall time, tokens, delegation latency. Used to ground model-change proposals
// in measurements instead of vibes (user rule: models change only with consent,
// backed by tests).
//
// The route scenario runs inside a generated mini-project so the coordinator
// has real code to delegate on; the metric is time-to-first-task() (coordinator
// speed), and the run is stopped right after delegation is observed.
//
// Usage: node scripts/bench-coordinator.mjs [--keep-sessions]
// Env:   BENCH_MODELS — comma-separated provider/model#variant candidates.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCENARIOS = [
  { id: 'trivial', prompt: 'Сколько будет 2+2? Ответь одним словом.', mode: 'full' },
  { id: 'route', prompt: 'Добавь валидацию email в форму регистрации в src/registration.ts', mode: 'to-task' },
  { id: 'micro', prompt: 'Назови дефолтного агента этой конфигурации и число агентов в реестре.', mode: 'full' },
];

const CANDIDATES = (
  process.env.BENCH_MODELS
  ?? 'dashscope/glm-5.3,dashscope/glm-5.3#high,dashscope/glm-5.3#low,dashscope-2/qwen3.8-flash,opencode-free-1/space-bunny-free'
).split(',').map((s) => s.trim()).filter(Boolean);

const DB_PATH = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');
const RUN_TIMEOUT_MS = 240_000;

const MINI_PROJECT = {
  'package.json': JSON.stringify({ name: 'bench-project', version: '1.0.0' }, null, 2),
  'src/registration.ts': [
    'export interface RegistrationForm {',
    '  email: string;',
    '  password: string;',
    '}',
    '',
    'export function submitRegistration(form: RegistrationForm): boolean {',
    '  // TODO: validate input before persisting',
    '  console.log("registering", form.email);',
    '  return true;',
    '}',
    '',
  ].join('\n'),
};

function sessionStats(title) {
  let db;
  try {
    db = new DatabaseSync(DB_PATH, { readOnly: true });
    const session = db.prepare('select id from session_v2 where title = ?').get(title);
    if (!session) return null;
    const messages = db.prepare('select data from session_message where session_id = ? order by seq').all(session.id);
    let tokensIn = 0;
    let tokensOut = 0;
    let reasoning = 0;
    const taskAgents = [];
    for (const message of messages) {
      const data = JSON.parse(message.data);
      const info = data.info ?? data;
      const tokens = info?.tokens;
      if (info?.role === 'assistant' && tokens) {
        tokensIn += tokens.input ?? 0;
        tokensOut += tokens.output ?? 0;
        reasoning += tokens.reasoning ?? 0;
      }
      for (const part of (data.parts ?? data.content ?? [])) {
        if (part?.type === 'tool' && (part.tool === 'task' || part.name === 'task')) {
          taskAgents.push(part.state?.input?.subagent_type ?? part.input?.subagent_type ?? '?');
        }
      }
    }
    return { tokensIn, tokensOut, reasoning, taskAgents };
  } catch {
    return null;
  } finally {
    try { db?.close(); } catch {}
  }
}

function purgeBenchSessions() {
  let db;
  try {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA busy_timeout = 8000');
    const ids = db.prepare("select id from session_v2 where title like 'bench-%'").all().map((r) => r.id);
    for (const id of ids) {
      for (const table of ['session_message', 'session_inbox', 'session_pending']) {
        db.prepare(`delete from ${table} where session_id = ?`).run(id);
      }
      db.prepare('delete from session_v2 where id = ?').run(id);
    }
    return ids.length;
  } catch (error) {
    console.error(`bench cleanup warning: ${error.message}`);
    return -1;
  } finally {
    try { db?.close(); } catch {}
  }
}

/** Run one scenario; resolves { wallSec, delegated, taskSec, answered, error }. */
function runScenario({ title, model, prompt, mode, cwd }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(
      'opencode',
      ['run', '--standalone', '--title', title, '-m', model, '--agent', 'openagent', '--format', 'json', '--auto', prompt],
      // shell: true — on Windows `opencode` is a .cmd shim.
      { cwd, encoding: 'utf8', shell: true },
    );
    let buffer = '';
    let taskSec = null;
    let answered = false;
    let settled = false;
    const finish = (error = '') => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { child.kill(); } catch {}
      resolve({
        wallSec: Math.round((Date.now() - started) / 1000),
        taskSec,
        delegated: taskSec !== null,
        answered,
        error,
      });
    };
    const timer = setTimeout(() => finish('timeout'), RUN_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        const part = event?.part ?? {};
        if (part.type === 'tool' && (part.tool === 'task' || part.name === 'task') && taskSec === null) {
          taskSec = Math.round((Date.now() - started) / 1000);
          if (mode === 'to-task') setTimeout(() => finish(), 1500);
        }
        if (part.type === 'text' && String(part.text ?? '').trim()) answered = true;
        if (event?.type === 'error' && !answered && taskSec === null) finish(String(event?.error?.message ?? event?.message ?? 'error event').slice(0, 120));
      }
    });
    child.on('error', (error) => finish(error.message));
    child.on('close', () => finish());
  });
}

const keepSessions = process.argv.includes('--keep-sessions');
const benchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-bench-'));
for (const [name, content] of Object.entries(MINI_PROJECT)) {
  fs.mkdirSync(path.dirname(path.join(benchDir, name)), { recursive: true });
  fs.writeFileSync(path.join(benchDir, name), content);
}
const rows = [];

console.log(`bench dir: ${benchDir}`);
console.log(`candidates: ${CANDIDATES.join(', ')}`);

for (const candidate of CANDIDATES) {
  for (const scenario of SCENARIOS) {
    const title = `bench-${candidate.replace(/[^a-z0-9]+/gi, '_')}-${scenario.id}`;
    const result = await runScenario({ title, model: candidate, prompt: scenario.prompt, mode: scenario.mode, cwd: benchDir });
    const stats = sessionStats(title);
    rows.push({
      candidate,
      scenario: scenario.id,
      wallSec: result.wallSec,
      taskSec: result.taskSec ?? '-',
      tokensIn: stats?.tokensIn ?? 0,
      tokensOut: stats?.tokensOut ?? 0,
      reasoning: stats?.reasoning ?? 0,
      delegated: (stats?.taskAgents ?? []).join('+') || (result.delegated ? 'task(?)' : '-'),
      ok: result.answered || result.delegated,
      error: result.error,
    });
    console.log(`done ${candidate} / ${scenario.id}: wall=${result.wallSec}s task=${result.taskSec ?? '-'}s ok=${rows.at(-1).ok}`);
  }
}

console.log('\n| model | scenario | wall s | task() at s | tokens in/out | reasoning | delegated to | ok |');
console.log('|---|---|---|---|---|---|---|---|');
for (const row of rows) {
  console.log(`| ${row.candidate} | ${row.scenario} | ${row.wallSec} | ${row.taskSec} | ${row.tokensIn}/${row.tokensOut} | ${row.reasoning} | ${row.delegated} | ${row.ok ? 'yes' : `no: ${row.error}`} |`);
}

fs.rmSync(benchDir, { recursive: true, force: true });
if (!keepSessions) {
  console.log(`\nbench sessions purged: ${purgeBenchSessions()}`);
} else {
  console.log('\n--keep-sessions: bench-* sessions left in the database');
}
