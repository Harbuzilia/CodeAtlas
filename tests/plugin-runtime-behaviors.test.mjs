// Runtime-behavior tests for the two plugins added in the Code Atlas wave:
// - halt-guard: a task() delegation killed by a transient provider error gets
//   exactly one retry nudge per failed part, hard-capped at 2 per session.
// - telemetry: delegations get wall-clock durations (delegate_start marker +
//   durationMs on the completion record).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

// The task-retry path must not sleep 3s in tests.
process.env.HALT_GUARD_TASK_BACKOFF_MS = '0';

function makeClient() {
  const prompts = [];
  return {
    prompts,
    client: {
      session: {
        prompt: async (args) => {
          prompts.push(args.body.parts[0].text);
        },
      },
    },
  };
}

const partEvent = (part) => ({ event: { type: 'message.part.updated', properties: { part } } });
const failedTaskPart = (id, sid, error) => ({
  type: 'tool',
  tool: 'task',
  id,
  sessionID: sid,
  state: { status: 'error', error },
});

test('halt-guard retries a transiently failed delegation once per part', async () => {
  const { client, prompts } = makeClient();
  const guard = await (await load('plugin/halt-guard.js')).default({ client });

  await guard.event(partEvent(failedTaskPart('p1', 'sess-retry-1', 'HTTP 429: rate limit exceeded')));
  assert.equal(prompts.length, 1, 'retryable task failure must be nudged');
  assert.match(prompts[0], /HALT-GUARD.*Делегирование task\(\) оборвалось/);
  assert.match(prompts[0], /Повтори task\(\) для того же агента/);

  // Same part fires again (status updates repeat) — no double nudge.
  await guard.event(partEvent(failedTaskPart('p1', 'sess-retry-1', 'HTTP 429: rate limit exceeded')));
  assert.equal(prompts.length, 1, 'the same failed part must not be nudged twice');

  // A different failed part gets its own single retry...
  await guard.event(partEvent(failedTaskPart('p2', 'sess-retry-1', 'socket hang up / timeout')));
  assert.equal(prompts.length, 2);

  // ...but the per-session budget (2) stops the third.
  await guard.event(partEvent(failedTaskPart('p3', 'sess-retry-1', 'overloaded 503')));
  assert.equal(prompts.length, 2, 'per-session task retry budget must cap the nudges');
});

test('halt-guard ignores fatal and non-task tool errors', async () => {
  const { client, prompts } = makeClient();
  const guard = await (await load('plugin/halt-guard.js')).default({ client });

  await guard.event(partEvent(failedTaskPart('p1', 'sess-fatal', '401 unauthorized: invalid api key')));
  await guard.event(
    partEvent({
      type: 'tool',
      tool: 'bash',
      id: 'p2',
      sessionID: 'sess-fatal',
      state: { status: 'error', error: 'exit code 1' },
    }),
  );
  await guard.event(partEvent(failedTaskPart('p3', 'sess-fatal', 'syntax error in output')));
  assert.equal(prompts.length, 0, 'fatal, non-task and non-retryable errors must not be nudged');
});

test('telemetry records delegation duration from start marker to completion', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-dur-'));
  try {
    const telemetry = await (await load('plugin/telemetry.js')).default({ directory: tmp });

    await telemetry.event(
      partEvent({ type: 'tool', tool: 'task', id: 'part-1', sessionID: 'sess-dur', state: { status: 'running' } }),
    );
    await telemetry['tool.execute.after']({ tool: 'task', sessionID: 'sess-dur', args: { subagent_type: 'coder' } });

    const journal = path.join(tmp, '.opencode', 'agent-journal.jsonl');
    const lines = fs.readFileSync(journal, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

    const start = lines.find((r) => r.type === 'delegate_start');
    assert.ok(start, 'delegate_start marker must be journaled');
    assert.equal(start.session, 'sess-dur');

    const delegate = lines.find((r) => r.type === 'delegate');
    assert.equal(delegate.agent, 'coder');
    assert.equal(delegate.session, 'sess-dur');
    assert.ok(
      typeof delegate.durationMs === 'number' && delegate.durationMs >= 0,
      'completion record must carry durationMs',
    );

    // The start map is consumed: a second completion for the same session has no duration.
    await telemetry['tool.execute.after']({ tool: 'task', sessionID: 'sess-dur', args: { subagent_type: 'tester' } });
    const lines2 = fs.readFileSync(journal, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    const second = lines2.filter((r) => r.type === 'delegate').at(-1);
    assert.equal(second.agent, 'tester');
    assert.equal(second.durationMs, undefined, 'a stale start must not produce a bogus duration');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
