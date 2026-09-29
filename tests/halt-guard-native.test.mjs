import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

// Backoffs must be zero for deterministic tests; read at module load.
process.env.HALT_GUARD_ERROR_BACKOFF_MS = '0';
process.env.HALT_GUARD_TASK_BACKOFF_MS = '0';

const root = path.resolve(import.meta.dirname, '..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

const SID = 'sess-halt-1';

function resetShared(shared) {
  for (const map of [shared.nudges, shared.errRetries, shared.sessionTaskRetries, shared.lastAssistant, shared.errorDedupe]) map.clear();
  for (const set of [shared.taskRetried, shared.aborted, shared.exhaustedNotified]) set.clear();
}

function makeIo({ rootSession = true, injectError } = {}) {
  const injections = [];
  return {
    injections,
    io: {
      inject: async (sid, text) => {
        if (injectError) throw injectError;
        injections.push({ sid, text });
      },
      isRoot: async () => rootSession,
    },
  };
}

const assistant = (id, text, hasTool = false) => ({ id, text, hasTool });
const drain = (policy, sid, last, todos = false) => policy.onDrain(sid, last, todos);

test('native user stop silences every later drain until a real user message', async () => {
  const guard = await load('plugin/halt-guard.js');
  const shared = guard.sharedState();
  resetShared(shared);
  const { io, injections } = makeIo();
  const policy = guard.createPolicy(io, shared);

  const stalled = assistant('m1', 'Передаю агенту coder, жду результатов…');
  await drain(policy, SID, stalled);
  assert.equal(injections.length, 1, 'a genuine stall is nudged');

  await guard.handleNativeEvent(policy, { type: 'session.execution.interrupted', data: { sessionID: SID, reason: 'user' } });
  await drain(policy, SID, assistant('m2', 'Передаю агенту tester…'));
  await drain(policy, SID, assistant('m3', 'делегирую reviewer…'));
  assert.equal(injections.length, 1, 'user stop = absolute silence');

  // Guard-authored input must NOT re-arm the guard.
  await policy.clearOnUserMessage(SID, '[HALT-GUARD] Продолжи route…');
  await drain(policy, SID, assistant('m4', 'Передаю агенту docwriter…'));
  assert.equal(injections.length, 1, 'synthetic guard input does not clear the abort mark');

  // A real user message re-arms exactly once.
  await policy.clearOnUserMessage(SID, 'продолжи, пожалуйста');
  await drain(policy, SID, assistant('m5', 'Передаю агенту coder…'));
  assert.equal(injections.length, 2);
  resetShared(shared);
});

test('prompt hook clears the abort mark only for non-guard prompts', async () => {
  const guard = await load('plugin/halt-guard.js');
  const shared = guard.sharedState();
  resetShared(shared);
  const hooks = new Map();
  const ctx = {
    session: {
      hook: async (name, fn) => { hooks.set(name, fn); return { dispose: async () => {} }; },
      get: async () => ({ data: { id: SID, parentID: null } }),
      synthetic: async () => {},
    },
  };
  const dispose = await guard.default.setup(ctx);
  const promptHook = hooks.get('prompt');
  assert.equal(typeof promptHook, 'function');

  shared.aborted.add(SID);
  await promptHook({ sessionID: SID, prompt: { text: '[HALT-GUARD] нудж' }, metadata: { source: 'halt-guard' } });
  assert.equal(shared.aborted.has(SID), true, 'guard input keeps the mark');
  await promptHook({ sessionID: SID, prompt: { text: 'что по задаче?' }, metadata: {} });
  assert.equal(shared.aborted.has(SID), false, 'real user prompt re-arms');

  assert.equal(typeof (await guard.default.setup({})), 'function', 'missing APIs must not crash activation');
  await dispose();
  resetShared(shared);
});

test('transient provider failure resumes once per backoff and respects abort during sleep', async () => {
  const guard = await load('plugin/halt-guard.js');
  const shared = guard.sharedState();
  resetShared(shared);
  const { io, injections } = makeIo();
  const policy = guard.createPolicy(io, shared);

  const err = { name: 'APIError', message: '429 rate limit exceeded', data: { isRetryable: true } };
  await guard.handleNativeEvent(policy, { type: 'session.execution.failed', data: { sessionID: SID, error: err } });
  assert.equal(injections.length, 1, 'retryable error resumes');
  assert.match(injections[0].text, /временной ошибкой провайдера/);

  // Same error inside the dedupe window is collapsed.
  await guard.handleNativeEvent(policy, { type: 'session.error', properties: { sessionID: SID, error: err } });
  assert.equal(injections.length, 1, 'deprecated duplicate event collapsed');

  // Abort arriving while a later backoff sleeps must kill the injection.
  const slow = { io: { inject: async (s, t) => injections.push({ sid: s, text: t }), isRoot: async () => true }, };
  const policy2 = guard.createPolicy(slow.io, shared);
  const pending = guard.handleNativeEvent(policy2, {
    type: 'session.execution.failed',
    data: { sessionID: SID, error: { name: 'APIError', message: '503 overload', data: { isRetryable: true } } },
  });
  shared.aborted.add(SID);
  await pending;
  assert.equal(injections.length, 1, 'abort during backoff = no resume');

  // Fatal errors never resume.
  shared.aborted.delete(SID);
  await policy.onError(SID, { name: 'APIError', message: '401 unauthorized' });
  assert.equal(injections.length, 1);
  resetShared(shared);
});

test('nudge budget is three per episode plus one exhaustion notice, deduped per message', async () => {
  const guard = await load('plugin/halt-guard.js');
  const shared = guard.sharedState();
  resetShared(shared);
  const { io, injections } = makeIo();
  const policy = guard.createPolicy(io, shared);

  const stalled = (id) => assistant(id, 'передаю задачу следующему агенту цепочки');
  await drain(policy, SID, stalled('a1'));
  await drain(policy, SID, stalled('a1')); // same message — no double nudge
  await drain(policy, SID, stalled('a2'));
  await drain(policy, SID, stalled('a3'));
  assert.equal(injections.length, 3, 'MAX_NUDGES respected');
  await drain(policy, SID, stalled('a4'));
  assert.equal(injections.length, 4, 'exhaustion notice is the fourth injection');
  assert.match(injections[3].text, /Бюджет авто-продолжений исчерпан/);
  await drain(policy, SID, stalled('a5'));
  assert.equal(injections.length, 4, 'exhaustion notice fires once per episode');

  // Recovery (tool activity) opens a new episode.
  await drain(policy, SID, assistant('a6', 'любое сообщение с tool-вызовом', true));
  await drain(policy, SID, stalled('a7'));
  assert.equal(injections.length, 5);
  resetShared(shared);
});

test('terminal phrase and tool activity reset budgets without injecting', async () => {
  const guard = await load('plugin/halt-guard.js');
  const shared = guard.sharedState();
  resetShared(shared);
  const { io, injections } = makeIo();
  const policy = guard.createPolicy(io, shared);

  await drain(policy, SID, assistant('t1', 'Работа завершена. Возвращаю управление.'));
  await drain(policy, SID, assistant('t2', 'текст с task() внутри', true));
  assert.equal(injections.length, 0);
  resetShared(shared);
});

test('failed task delegation retries once per part and twice per session', async () => {
  const guard = await load('plugin/halt-guard.js');
  const shared = guard.sharedState();
  resetShared(shared);
  const { io, injections } = makeIo();
  const policy = guard.createPolicy(io, shared);

  const partError = (partId, msg) => guard.handleNativeEvent(policy, {
    type: 'message.part.updated',
    data: { part: { type: 'tool', tool: 'task', id: partId, sessionID: SID, state: { status: 'error', error: msg } } },
  });

  await partError('p1', 'network socket hang up');
  await partError('p1', 'network socket hang up'); // same part — no second retry
  await partError('p2', 'ECONNRESET while calling subagent');
  assert.equal(injections.length, 2, 'MAX_TASK_RETRIES_PER_SESSION');
  await partError('p3', 'timeout fetching subagent');
  assert.equal(injections.length, 2);

  // User-aborted tool part marks the session instead of retrying.
  await guard.handleNativeEvent(policy, {
    type: 'message.part.updated',
    data: { part: { type: 'tool', tool: 'task', id: 'p4', sessionID: SID, state: { status: 'error', error: 'x', metadata: { interrupted: true } } } },
  });
  assert.equal(shared.aborted.has(SID), true);
  assert.equal(injections.length, 2);
  resetShared(shared);
});

test('subagent sessions stay silent (parentID guard)', async () => {
  const guard = await load('plugin/halt-guard.js');
  const shared = guard.sharedState();
  resetShared(shared);
  const { io, injections } = makeIo({ rootSession: false });
  const policy = guard.createPolicy(io, shared);
  await drain(policy, SID, assistant('c1', 'передаю coder'));
  await policy.onError(SID, { name: 'APIError', message: '429 rate limit', data: { isRetryable: true } });
  assert.equal(injections.length, 0);
  resetShared(shared);
});

test('duplicate plugin copies share one budget and one event consumer', async () => {
  const source = await load('plugin/halt-guard.js');
  const mirror = await load('.opencode/plugin/halt-guard.js');
  const shared = source.sharedState();
  resetShared(shared);
  assert.equal(mirror.sharedState(), shared, 'mirror must join the same process-wide registry');

  const injections = [];
  const makeCtx = () => ({
    session: {
      hook: async () => ({ dispose: async () => {} }),
      get: async () => ({ data: { id: SID, parentID: null } }),
      synthetic: async (payload) => { injections.push(payload); },
    },
    event: {
      subscribe: async () => ({
        stream: {
          async *[Symbol.asyncIterator]() {
            // never yields: consumer ownership is what this test asserts
          },
        },
      }),
    },
  });

  const disposeA = await source.default.setup(makeCtx());
  const disposeB = await mirror.default.setup(makeCtx());
  assert.equal(shared.owners.size >= 2, true);

  const policy = source.createPolicy({ inject: async (s, t) => injections.push({ text: t }), isRoot: async () => true }, shared);
  for (const id of ['d1', 'd2', 'd3', 'd4']) {
    await policy.onDrain(SID, assistant(id, 'делегирую следующему агенту'));
  }
  assert.equal(injections.length, 4, 'shared budget: 3 nudges + 1 exhaustion, not doubled');

  await disposeA();
  assert.equal(shared.owners.size >= 1, true);
  await disposeB();
  resetShared(shared);
});

test('native ring buffer feeds the drain boundary from message.updated', async () => {
  const guard = await load('plugin/halt-guard.js');
  const shared = guard.sharedState();
  resetShared(shared);
  const { io, injections } = makeIo();
  const policy = guard.createPolicy(io, shared);

  await guard.handleNativeEvent(policy, {
    type: 'message.updated',
    data: {
      info: { role: 'assistant', id: 'r1', sessionID: SID, time: { completed: Date.now() } },
      parts: [{ type: 'text', text: 'вызываю task(coder) текстом, но не вызываю' }],
    },
  });
  await guard.handleNativeEvent(policy, { type: 'session.execution.succeeded', data: { sessionID: SID } });
  assert.equal(injections.length, 1, 'drain reads the ring, no message polling in 2.x');
  resetShared(shared);
});
