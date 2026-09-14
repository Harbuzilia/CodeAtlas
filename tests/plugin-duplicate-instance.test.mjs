// Regression test: opencode loads the same plugin twice when it exists in both the
// global config (~/.config/opencode/plugin) and the project (.opencode/plugin).
// Both copies receive every event. Before the fix this doubled every telemetry
// record and doubled the halt-guard nudge budget per session.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

test('telemetry writes a duplicated event once but keeps later real events', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tlm-'));
  try {
    const TelemetryA = (await load('plugin/telemetry.js')).default;
    const TelemetryB = (await load('.opencode/plugin/telemetry.js')).default;
    const a = await TelemetryA({ directory: tmp });
    const b = await TelemetryB({ directory: tmp });

    const input = { tool: 'task', sessionID: 's1', args: { subagent_type: 'coder' } };
    await a['tool.execute.after'](input);
    await b['tool.execute.after'](input);

    const journal = path.join(tmp, '.opencode', 'agent-journal.jsonl');
    const read = () => fs.readFileSync(journal, 'utf8').trim().split('\n').filter(Boolean);

    assert.equal(read().length, 1, 'the duplicate plugin instance must not double-write');

    await new Promise((r) => setTimeout(r, 80));
    await a['tool.execute.after'](input);
    assert.equal(read().length, 2, 'a genuinely later event must still be recorded');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('halt-guard shares the nudge budget across duplicate plugin instances', async () => {
  let messageSeq = 0;
  let prompts = 0;
  const client = {
    session: {
      get: async () => ({ data: { id: 's1' } }),
      messages: async () => ({
        data: [
          {
            info: { role: 'assistant', id: `m${++messageSeq}`, time: { completed: 1 } },
            parts: [{ type: 'text', text: 'Передаю агенту coder задачу.' }],
          },
        ],
      }),
      todo: async () => ({ data: [] }),
      prompt: async () => {
        prompts += 1;
      },
    },
  };

  const HaltGuardA = (await load('plugin/halt-guard.js')).default;
  const HaltGuardB = (await load('.opencode/plugin/halt-guard.js')).default;
  const a = await HaltGuardA({ client });
  const b = await HaltGuardB({ client });

  for (let i = 0; i < 6; i++) {
    const handler = i % 2 === 0 ? a : b;
    await handler.event({ event: { type: 'session.idle', properties: { sessionID: 's1' } } });
  }

  assert.equal(prompts, 3, 'MAX_NUDGES=3 must hold across both plugin instances');
});
