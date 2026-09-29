import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

const readJournal = (dir) => {
  const file = path.join(dir, '.opencode', 'agent-journal.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
};

test('native setup records tool executions into the journal', async () => {
  const telemetry = await load('plugin/telemetry.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-native-'));
  const toolHooks = new Map();
  const ctx = {
    location: { directory: dir },
    tool: {
      hook: async (name, fn) => {
        toolHooks.set(name, fn);
        return { dispose: async () => {} };
      },
    },
  };
  const dispose = await telemetry.default.setup(ctx);
  const after = toolHooks.get('execute.after');
  assert.equal(typeof after, 'function');

  await after({ tool: 'shell', sessionID: 's1', input: { command: 'ls' } });
  await after({ tool: 'task', sessionID: 's1', input: { subagent_type: 'coder' } });

  const records = readJournal(dir);
  assert.equal(records.length, 2);
  assert.equal(records[0].tool, 'shell');
  assert.equal(records[1].type, 'delegate');
  assert.equal(records[1].agent, 'coder');

  await dispose();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('native event stream maps drain, tokens, delegate starts and tool errors', async () => {
  const telemetry = await load('plugin/telemetry.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-events-'));
  const queue = [];
  let waiter = null;
  const ctx = {
    location: { directory: dir },
    event: {
      subscribe: async () => ({
        stream: {
          async *[Symbol.asyncIterator]() {
            for (;;) {
              if (queue.length) yield queue.shift();
              else yield await new Promise((resolve) => { waiter = resolve; });
            }
          },
        },
      }),
    },
  };
  const push = (item) => {
    queue.push(item);
    if (waiter) { const resolve = waiter; waiter = null; resolve(item); }
  };

  const dispose = await telemetry.default.setup(ctx);
  // let the consumer attach
  await new Promise((resolve) => setTimeout(resolve, 10));

  push({ type: 'message.part.updated', data: { part: { type: 'tool', tool: 'task', id: 'p1', sessionID: 's2', state: { status: 'running' } } } });
  push({ type: 'message.updated', data: { info: { role: 'assistant', id: 'm1', sessionID: 's2', time: { completed: Date.now() }, tokens: { input: 10, output: 5, cache: { read: 2, write: 1 } } } } });
  push({ type: 'message.part.updated', data: { part: { type: 'tool', tool: 'shell', id: 'p2', sessionID: 's2', state: { status: 'error', error: 'boom' } } } });
  push({ type: 'session.execution.succeeded', data: { sessionID: 's2' } });

  for (let attempt = 0; attempt < 50 && readJournal(dir).length < 4; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const records = readJournal(dir);
  const types = records.map((r) => r.type ?? `tool:${r.tool}`);
  assert.deepEqual(types, ['delegate_start', 'tokens', 'tool_error', 'session_idle']);
  assert.equal(records[1].input, 10);
  assert.equal(records[1].cache, 3);

  await dispose();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('duplicate plugin copies write one record per event', async () => {
  const source = await load('plugin/telemetry.js');
  const mirror = await load('.opencode/plugin/telemetry.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-dedupe-'));
  const hooks = [];
  const makeCtx = () => ({
    location: { directory: dir },
    tool: { hook: async (name, fn) => { hooks.push(fn); return { dispose: async () => {} }; } },
  });

  const disposeA = await source.default.setup(makeCtx());
  const disposeB = await mirror.default.setup(makeCtx());
  assert.equal(hooks.length, 2, 'both plugin copies register the tool hook');

  // Both copies see the same tool event (double load under 2.x).
  const payload = { tool: 'read', sessionID: 's3', input: { path: 'a.ts' } };
  await hooks[0](payload);
  await hooks[1](payload);
  const records = readJournal(dir);
  assert.equal(records.length, 1, 'cross-instance dedupe keeps one record');

  await disposeA();
  await disposeB();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('setup survives missing tool and event APIs', async () => {
  const telemetry = await load('plugin/telemetry.js');
  assert.equal(typeof (await telemetry.default.setup({})), 'function');
  const toolOnly = await telemetry.default.setup({ tool: { hook: async () => ({ dispose: async () => {} }) } });
  await toolOnly();
});
