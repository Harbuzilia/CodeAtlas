// Resilience tests: user aborts must never be auto-resumed, and foreground
// dev servers must be blocked before they hang the shell tool.
//
// Upstream context: opencode #49169 (foreground server keeps the stdio pipe
// open past the timeout) and the MessageAbortedError semantics of session.error
// on user Esc (processor.ts onInterrupt -> halt(AbortError)).

import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

process.env.HALT_GUARD_TASK_BACKOFF_MS = '0';
process.env.HALT_GUARD_ERROR_BACKOFF_MS = '0';

function makeClient() {
  const prompts = [];
  return {
    prompts,
    client: {
      session: {
        get: async () => ({ data: { id: 's', parentID: null } }),
        prompt: async (args) => {
          prompts.push(args.body.parts[0].text);
        },
        messages: async () => ({
          data: [
            {
              info: { role: 'assistant', id: 'm1', time: { completed: 1 } },
              parts: [{ type: 'text', text: 'Передаю агенту coder задачу.' }],
            },
          ],
        }),
        todo: async () => ({ data: [] }),
      },
    },
  };
}

const idle = (sid) => ({ event: { type: 'session.idle', properties: { sessionID: sid } } });
const userMsg = (sid) => ({ event: { type: 'message.updated', properties: { info: { role: 'user', sessionID: sid } } } });

test('halt-guard respects user abort: no resume, no idle nudge until user writes', async () => {
  const { client, prompts } = makeClient();
  const guard = await (await load('plugin/halt-guard.js')).default.server({ client });

  // User pressed Esc: session.error with MessageAbortedError.
  await guard.event({
    event: {
      type: 'session.error',
      properties: { sessionID: 'sess-abort', error: { name: 'MessageAbortedError', data: { message: 'Aborted' } } },
    },
  });
  assert.equal(prompts.length, 0, 'a user abort must never be auto-resumed');

  // Idle follows the abort immediately — must stay silent.
  await guard.event(idle('sess-abort'));
  assert.equal(prompts.length, 0, 'idle right after a user abort must not nudge');

  // An interrupted tool part also marks the session.
  await guard.event({
    event: {
      type: 'message.part.updated',
      properties: {
        part: {
          type: 'tool',
          tool: 'bash',
          id: 'p1',
          sessionID: 'sess-abort2',
          state: { status: 'error', error: 'Tool execution aborted', metadata: { interrupted: true } },
        },
      },
    },
  });
  await guard.event(idle('sess-abort2'));
  assert.equal(prompts.length, 0, 'interrupted tool part must mark the session as user-aborted');

  // The user writes again -> the mark clears -> a genuine stall is nudged.
  await guard.event(userMsg('sess-abort'));
  await guard.event(idle('sess-abort'));
  assert.equal(prompts.length, 1, 'after a new user message the guard works again');
  assert.match(prompts[0], /HALT-GUARD/);
});

test('halt-guard does not resume non-retryable API errors', async () => {
  const { client, prompts } = makeClient();
  const guard = await (await load('plugin/halt-guard.js')).default.server({ client });
  await guard.event({
    event: {
      type: 'session.error',
      properties: {
        sessionID: 'sess-api',
        error: { name: 'APIError', data: { message: 'model exploded', statusCode: 400, isRetryable: false } },
      },
    },
  });
  assert.equal(prompts.length, 0, 'isRetryable=false must not trigger a resume');
});

test('halt-guard exhaustion is per stall episode, not per whole session', async () => {
  let messageSeq = 0;
  const prompts = [];
  const client = {
    session: {
      get: async () => ({ data: { id: 's', parentID: null } }),
      messages: async () => ({
        data: [
          {
            info: { role: 'assistant', id: `m${++messageSeq}`, time: { completed: 1 } },
            parts: [{ type: 'text', text: 'Передаю агенту coder задачу.' }],
          },
        ],
      }),
      todo: async () => ({ data: [] }),
      prompt: async (args) => {
        prompts.push(args.body.parts[0].text);
      },
    },
  };
  const guard = await (await load('plugin/halt-guard.js')).default.server({ client });

  // First episode: 3 nudges + one closing exhaustion prompt.
  for (let i = 0; i < 4; i++) await guard.event(idle('sess-ep'));
  assert.equal(prompts.length, 4, '3 nudges + 1 exhaustion prompt');
  assert.match(prompts[3], /Бюджет авто-продолжений исчерпан/);

  // The stall drags on within the same episode — stays silent.
  await guard.event(idle('sess-ep'));
  assert.equal(prompts.length, 4, 'no repeat exhaustion prompt within one episode');

  // The user comes back and the session stalls again — a new episode must speak.
  await guard.event(userMsg('sess-ep'));
  await guard.event(idle('sess-ep'));
  assert.equal(prompts.length, 5, 'exhaustion after recovery must not be silent');
  assert.match(prompts[4], /Бюджет авто-продолжений исчерпан/);
});

test('secret-guard blocks secret file access via file tools and bash, passes normal work', async () => {
  const guard = await (await load('plugin/secret-guard.js')).default.server({});
  const hook = guard['tool.execute.before'];
  const fileTool = (tool, file_path) => hook({ tool, sessionID: 's', callID: 'c' }, { args: { file_path } });
  const bash = (command) => hook({ tool: 'bash', sessionID: 's', callID: 'c' }, { args: { command } });

  await assert.rejects(() => fileTool('read', 'apps/crm/.env'), /SECRET-GUARD/);
  await assert.rejects(() => fileTool('read', 'C:\\secrets\\server.key'), /SECRET-GUARD/);
  await assert.rejects(() => fileTool('edit', '/home/u/.ssh/id_rsa'), /SECRET-GUARD/);
  await assert.rejects(() => bash('cat .env.production'), /SECRET-GUARD/);
  await assert.rejects(() => bash('Get-Content deploy.pem'), /SECRET-GUARD/);
  await assert.rejects(() => bash('cat prod.env'), /SECRET-GUARD/, 'non-dotfile *.env must be blocked');
  await assert.rejects(() => bash('rg DATABASE_URL .env'), /SECRET-GUARD/, 'rg must be covered as a reader');

  await fileTool('read', 'src/app.ts');
  await fileTool('edit', 'apps/crm/.env.example');
  await bash('npm test');
  await bash('cat README.md');
  await bash('cat .env.example');
  await bash('type .env.sample');
});

test('bash-guard blocks foreground dev servers and pipe hangs, passes bounded commands', async () => {
  const guard = await (await load('plugin/bash-guard.js')).default.server({});
  const hook = guard['tool.execute.before'];
  const run = (command) => hook({ tool: 'bash', sessionID: 's', callID: 'c' }, { args: { command } });

  await assert.rejects(() => run('pnpm dev'), /BASH-GUARD/, 'foreground pnpm dev must be blocked');
  await assert.rejects(() => run('cd apps/crm && npm run dev:api'), /BASH-GUARD/, 'npm run dev:api must be blocked');
  await assert.rejects(
    () => run('cmd /c "set X=1 && pnpm dev:api 2>&1" | Select-Object -First 3'),
    /BASH-GUARD/,
    'piping a dev server into Select-Object must be blocked',
  );
  await assert.rejects(() => run('tsx watch api/server.ts'), /BASH-GUARD/, 'tsx watch must be blocked');
  await assert.rejects(() => run('dotnet run'), /BASH-GUARD/, 'dotnet run must be blocked');
  await assert.rejects(() => run('ng serve --port 4200'), /BASH-GUARD/, 'ng serve must be blocked');
  await assert.rejects(() => run('python manage.py runserver'), /BASH-GUARD/, 'manage.py runserver must be blocked');
  await assert.rejects(() => run('npx vitest --watch'), /BASH-GUARD/, 'vitest --watch must be blocked');
  await assert.rejects(() => run('flask run'), /BASH-GUARD/, 'flask run must be blocked');

  // Detached launches and bounded commands pass.
  await run("Start-Process pwsh -ArgumentList 'pnpm dev:api' -WindowStyle Hidden");
  await run('nohup pnpm dev > server.log 2>&1 &');
  await run('timeout 120 dotnet run');
  await run('npm test');
  await run('npm run build');
  await run('git status');
  await run('pw open http://localhost:3000');
  await run('playwright-cli snapshot');
});

test('native 2.x setup adapters enforce guards through ctx.tool.hook', async () => {
  const makeCtx = () => {
    const handlers = new Map();
    const ctx = {
      tool: {
        hook: async (name, fn) => {
          handlers.set(name, fn);
          return { dispose: async () => {} };
        },
      },
    };
    return { ctx, handlers };
  };

  // image-guard: block image reads for text-only agents, allow vision/uitester
  const img = await load('plugin/image-guard.js');
  const { ctx: imgCtx, handlers: imgH } = makeCtx();
  await img.default.setup(imgCtx);
  const imgBefore = imgH.get('execute.before');
  assert.equal(typeof imgBefore, 'function', 'image-guard must register execute.before');
  await assert.rejects(() => imgBefore({ tool: 'read', agent: 'openagent', input: { path: 'a/b.png' } }), /IMAGE-GUARD/);
  await imgBefore({ tool: 'read', agent: 'vision', input: { path: 'a/b.png' } });
  await imgBefore({ tool: 'read', agent: 'uitester', input: { path: 'shot.PNG' } });
  await imgBefore({ tool: 'read', agent: 'openagent', input: { path: 'README.md' } });
  await imgBefore({ tool: 'shell', agent: 'openagent', input: { command: 'echo hi' } });

  // bash-guard: foreground dev server blocked via the native payload
  const bg = await load('plugin/bash-guard.js');
  const { ctx: bgCtx, handlers: bgH } = makeCtx();
  await bg.default.setup(bgCtx);
  const bgBefore = bgH.get('execute.before');
  await assert.rejects(() => bgBefore({ tool: 'shell', agent: 'openagent', input: { command: 'pnpm dev' } }), /BASH-GUARD/);
  await bgBefore({ tool: 'shell', input: { command: 'npm test' } });

  // secret-guard: path + shell readers via the native payload
  const sg = await load('plugin/secret-guard.js');
  const { ctx: sgCtx, handlers: sgH } = makeCtx();
  await sg.default.setup(sgCtx);
  const sgBefore = sgH.get('execute.before');
  await assert.rejects(() => sgBefore({ tool: 'read', input: { path: 'apps/.env' } }), /SECRET-GUARD/);
  await assert.rejects(() => sgBefore({ tool: 'shell', input: { command: 'cat prod.env' } }), /SECRET-GUARD/);
  await sgBefore({ tool: 'read', input: { path: '.env.example' } });
  await sgBefore({ tool: 'shell', input: { command: 'npm test' } });
});
