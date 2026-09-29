import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const activeDisposers = [];

async function setup(plugin, ctx) {
  const dispose = await plugin.default.setup(ctx);
  activeDisposers.push(dispose);
  return dispose;
}

test.afterEach(async () => {
  for (const dispose of activeDisposers.splice(0).reverse()) {
    try {
      await dispose();
    } catch {}
  }
});

function makeCtx({
  switchError,
  restoreError,
  switchModelError,
  session = true,
  tool = true,
  eventApi = true,
  modelApi = true,
  initialAgent = 'openagent',
  initialModel = { providerID: 'dashscope', id: 'glm-5.3', variant: 'default' },
} = {}) {
  const sessionHooks = new Map();
  const toolHooks = new Map();
  const eventHooks = [];
  const switches = [];
  const modelSwitches = [];
  const disposed = [];
  const agents = new Map([['sess-image-1', initialAgent]]);
  const models = new Map([['sess-image-1', initialModel]]);
  const ctx = {};

  if (session) {
    ctx.session = {
      hook: async (name, fn) => {
        sessionHooks.set(name, fn);
        return { dispose: async () => disposed.push(`session:${name}`) };
      },
      get: async ({ sessionID }) => ({
        data: { id: sessionID, agent: agents.get(sessionID) ?? initialAgent, model: models.get(sessionID) ?? initialModel },
      }),
      switchAgent: async (payload) => {
        switches.push(payload);
        if (switchError && payload.agent === 'vision') throw switchError;
        if (restoreError && payload.agent !== 'vision') throw restoreError;
        agents.set(payload.sessionID, payload.agent);
      },
    };
    if (modelApi) {
      ctx.session.switchModel = async (payload) => {
        modelSwitches.push(payload);
        if (switchModelError && payload.model?.id === 'space-bunny-free') throw switchModelError;
        models.set(payload.sessionID, payload.model);
      };
    }
  }
  if (eventApi) {
    ctx.event = {
      subscribe: async () => ({
        stream: {
          async *[Symbol.asyncIterator]() {
            // Mirrors the generated 2.0.19 ServerSentEventsResult shape.
          },
        },
      }),
    };
  }
  if (tool) {
    ctx.tool = {
      hook: async (name, fn) => {
        toolHooks.set(name, fn);
        return { dispose: async () => disposed.push(`tool:${name}`) };
      },
    };
  }
  const emit = async (type, sessionID = 'sess-image-1', properties = {}) => {
    const plugin = await load('plugin/image-guard.js');
    await plugin.handleSessionEvent(ctx, { type, properties: { sessionID, ...properties } });
  };
  return { ctx, sessionHooks, toolHooks, eventHooks, switches, modelSwitches, disposed, agents, models, emit, initialModel };
}

const event = (files, text = 'Что изображено?') => ({
  sessionID: 'sess-image-1',
  messageID: 'msg-1',
  prompt: { text, files },
  metadata: {},
  delivery: {},
});

test('setup registers prompt and tool hooks independently and disposes both safely', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const both = makeCtx();
  const dispose = await setup(imageGuard, both.ctx);
  assert.equal(typeof both.sessionHooks.get('prompt'), 'function');
  assert.equal(typeof both.sessionHooks.get('idle'), 'function');
  assert.equal(typeof both.sessionHooks.get('error'), 'function');
  assert.equal(typeof both.toolHooks.get('execute.before'), 'function');
  await dispose();
  assert.deepEqual(both.disposed, ['tool:execute.before', 'session:error', 'session:idle', 'session:prompt']);
  await dispose();

  const sessionOnly = makeCtx({ tool: false });
  await setup(imageGuard, sessionOnly.ctx);
  assert.equal(typeof sessionOnly.sessionHooks.get('prompt'), 'function');

  const toolOnly = makeCtx({ session: false });
  await setup(imageGuard, toolOnly.ctx);
  assert.equal(typeof toolOnly.toolHooks.get('execute.before'), 'function');

  assert.equal(typeof (await setup(imageGuard, {})), 'function', 'missing APIs must not crash activation');
});

test('prompt hook detects data URI, names, paths, file URIs, uppercase, query and hash variants', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const variants = [
    'data:image/png;base64,AA==',
    { name: 'photo.JPG' },
    { filename: 'scan.tif?download=1' },
    { fileName: 'vector.SVG#page=1' },
    { path: 'C:\\Shots\\screen.WEBP?raw=1#x' },
    { uri: 'file:///C:/Shots/camera.HEIC#preview' },
    { url: 'https://example.test/a/b/image.AVIF?size=2' },
    { href: '/tmp/picture.heif' },
    { source: 'asset.bmp#v2' },
    { data: 'data:image/svg+xml,%3Csvg/%3E' },
    { path: '/tmp/frame.GIF' },
    { path: '/tmp/frame.TIFF' },
    { path: '/tmp/frame.jpeg' },
  ];

  for (const file of variants) {
    const fixture = makeCtx();
    await setup(imageGuard, fixture.ctx);
    await fixture.sessionHooks.get('prompt')(event([file]));
    assert.deepEqual(fixture.switches, [{ sessionID: 'sess-image-1', agent: 'vision' }], JSON.stringify(file));
  }
});

test('prompt hook uses exact switchAgent payload and metadata dedupes duplicate plugin callbacks', async () => {
  const source = await load('plugin/image-guard.js');
  const runtime = await load('.opencode/plugin/image-guard.js');
  const fixture = makeCtx();
  const callbacks = [];
  fixture.ctx.session.hook = async (_name, fn) => {
    callbacks.push(fn);
    return { dispose: async () => {} };
  };
  await setup(source, fixture.ctx);
  await setup(runtime, fixture.ctx);

  const shared = event([{ uri: 'file:///tmp/SHOT.PNG?x=1#preview' }]);
  await Promise.all(callbacks.map((fn) => fn(shared)));
  assert.deepEqual(fixture.switches, [{ sessionID: 'sess-image-1', agent: 'vision' }]);
  assert.equal(shared.metadata.imageGuardVisionRoute, 'vision');
  assert.equal(shared.prompt.text, 'Что изображено?', 'routing must not recursively prompt or rewrite text');
});

test('prompt hook ignores text-only, empty files and non-image attachments', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx();
  await setup(imageGuard, fixture.ctx);
  const hook = fixture.sessionHooks.get('prompt');

  await hook({ sessionID: 's', prompt: { text: 'hello' }, metadata: {} });
  await hook(event([]));
  await hook(event([{ name: 'README.md' }, { uri: 'file:///tmp/archive.tar.gz?x=1' }]));
  assert.deepEqual(fixture.switches, []);
});

test('switch failure withholds images, retains non-images, explains deterministically and marks metadata', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx({ switchError: new Error('vision unavailable') });
  await setup(imageGuard, fixture.ctx);
  const shared = event([
    { name: 'notes.txt', uri: 'file:///tmp/notes.txt' },
    { name: 'SCREEN.PNG', uri: 'file:///tmp/SCREEN.PNG?raw=1' },
    'data:image/jpeg;base64,AA==',
  ], 'Please inspect both files.');

  await fixture.sessionHooks.get('prompt')(shared);
  assert.deepEqual(shared.prompt.files, [{ name: 'notes.txt', uri: 'file:///tmp/notes.txt' }]);
  assert.match(shared.prompt.text, /^\[IMAGE-GUARD\] Вложение-изображение скрыто:/);
  assert.equal(
    shared.prompt.text,
    `${imageGuard.WITHHELD_EXPLANATION}\n\nPlease inspect both files.`,
    'failure text must be deterministic and must not leak provider details',
  );
  assert.equal(shared.metadata.imageGuardVisionRoute, 'failed');
  assert.equal(shared.metadata.imageGuardImagesWithheld, true);
});

test('tool read defence coexists with prompt routing', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx();
  await setup(imageGuard, fixture.ctx);
  await fixture.sessionHooks.get('prompt')(event([{ path: 'shot.png' }]));
  assert.equal(fixture.switches.length, 1);

  const before = fixture.toolHooks.get('execute.before');
  await assert.rejects(() => before({ tool: 'read', agent: 'openagent', input: { path: 'shot.svg?raw=1' } }), /IMAGE-GUARD/);
  await before({ tool: 'read', agent: 'vision', input: { path: 'shot.HEIC#preview' } });
  await before({ tool: 'read', agent: 'openagent', input: { path: 'notes.txt' } });
});

test('persistent switch restores the actual prior agent only at idle, not at intermediate step end', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx({ initialAgent: 'reviewer' });
  const dispose = await setup(imageGuard, fixture.ctx);

  await fixture.sessionHooks.get('prompt')(event([{ path: 'shot.png' }]));
  assert.equal(fixture.agents.get('sess-image-1'), 'vision');
  assert.deepEqual(fixture.switches[0], { sessionID: 'sess-image-1', agent: 'vision' });
  assert.deepEqual(fixture.modelSwitches[0], { sessionID: 'sess-image-1', model: imageGuard.VISION_MODEL });

  await fixture.emit('session.next.step.ended', 'sess-image-1', { assistantMessageID: 'a1' });
  assert.equal(fixture.agents.get('sess-image-1'), 'vision', 'tool-using turns may continue after step.ended');

  await fixture.emit('session.idle');
  assert.equal(fixture.agents.get('sess-image-1'), 'reviewer');
  assert.deepEqual(fixture.switches.at(-1), { sessionID: 'sess-image-1', agent: 'reviewer' });
  assert.deepEqual(fixture.models.get('sess-image-1'), fixture.initialModel, 'the session model override returns too');
  await dispose();
});

test('native session lifecycle hook restores at idle', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx();
  await setup(imageGuard, fixture.ctx);
  await fixture.sessionHooks.get('prompt')(event([{ path: 'native.png' }]));
  await fixture.sessionHooks.get('idle')({ sessionID: 'sess-image-1' });
  assert.equal(fixture.agents.get('sess-image-1'), 'openagent');
});

test('provider failure or interruption restores the coordinator and idle remains idempotent', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx();
  await setup(imageGuard, fixture.ctx);
  await fixture.sessionHooks.get('prompt')(event([{ path: 'shot.webp' }]));

  await fixture.emit('session.error', 'sess-image-1', { error: { name: 'MessageAbortedError' } });
  assert.equal(fixture.agents.get('sess-image-1'), 'openagent');
  const count = fixture.switches.length;
  await fixture.emit('session.idle');
  assert.equal(fixture.switches.length, count, 'following idle must not restore twice');
});

test('queued text prompt is switched back before materialization while the active image turn stays routed', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx();
  await setup(imageGuard, fixture.ctx);
  const hook = fixture.sessionHooks.get('prompt');

  await hook(event([{ path: 'shot.png' }]));
  const queued = {
    sessionID: 'sess-image-1',
    messageID: 'msg-text',
    prompt: { text: 'Now answer text only', files: [] },
    metadata: {},
    delivery: 'queue',
  };
  await hook(queued);

  assert.equal(queued.metadata.imageGuardCoordinatorRoute, 'restored');
  assert.equal(fixture.agents.get('sess-image-1'), 'openagent');
  assert.deepEqual(fixture.switches, [
    { sessionID: 'sess-image-1', agent: 'vision' },
    { sessionID: 'sess-image-1', agent: 'openagent' },
  ]);
  assert.deepEqual(fixture.modelSwitches, [
    { sessionID: 'sess-image-1', model: imageGuard.VISION_MODEL },
    { sessionID: 'sess-image-1', model: fixture.initialModel },
  ]);
  await fixture.emit('session.idle');
});

test('multiple queued images keep vision until terminal drain and concurrent sessions restore independently', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx({ initialAgent: 'planner' });
  fixture.agents.set('sess-image-2', 'coder');
  await setup(imageGuard, fixture.ctx);
  const hook = fixture.sessionHooks.get('prompt');

  const secondImage = event([{ path: 'two.JPG' }]);
  secondImage.messageID = 'msg-2';
  secondImage.delivery = 'queue';
  const otherSession = event([{ path: 'other.svg' }]);
  otherSession.sessionID = 'sess-image-2';
  otherSession.messageID = 'msg-other';
  await Promise.all([hook(event([{ path: 'one.png' }])), hook(secondImage), hook(otherSession)]);

  assert.equal(fixture.agents.get('sess-image-1'), 'vision');
  assert.equal(fixture.agents.get('sess-image-2'), 'vision');
  await fixture.emit('session.idle', 'sess-image-1');
  assert.equal(fixture.agents.get('sess-image-1'), 'planner');
  assert.equal(fixture.agents.get('sess-image-2'), 'vision');
  await fixture.emit('session.idle', 'sess-image-2');
  assert.equal(fixture.agents.get('sess-image-2'), 'coder');
});

test('duplicate plugin copies share restoration ownership and cleanup never restores early', async () => {
  const source = await load('plugin/image-guard.js');
  const runtime = await load('.opencode/plugin/image-guard.js');
  const fixture = makeCtx();
  const callbacks = [];
  fixture.ctx.session.hook = async (_name, fn) => {
    callbacks.push(fn);
    return { dispose: async () => {} };
  };
  const disposeSource = await setup(source, fixture.ctx);
  const disposeRuntime = await setup(runtime, fixture.ctx);
  const shared = event([{ path: 'dup.png' }]);
  await Promise.all(callbacks.map((fn) => fn(shared)));
  assert.equal(fixture.agents.get('sess-image-1'), 'vision');

  await disposeSource();
  assert.equal(fixture.agents.get('sess-image-1'), 'vision', 'another copy still owns lifecycle handling');
  await disposeRuntime();
  assert.equal(fixture.agents.get('sess-image-1'), 'openagent', 'last cleanup restores stranded session');
});

test('restore failure is observable and remains retryable on a later terminal event', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  let failRestore = true;
  const fixture = makeCtx();
  const original = fixture.ctx.session.switchAgent;
  fixture.ctx.session.switchAgent = async (payload) => {
    if (payload.agent !== 'vision' && failRestore) throw new Error('restore unavailable');
    return original(payload);
  };
  await setup(imageGuard, fixture.ctx);
  await fixture.sessionHooks.get('prompt')(event([{ path: 'retry.png' }]));

  await assert.rejects(() => fixture.emit('session.error'), /restore unavailable/);
  assert.equal(fixture.agents.get('sess-image-1'), 'vision');
  failRestore = false;
  await fixture.emit('session.idle');
  assert.equal(fixture.agents.get('sess-image-1'), 'openagent');
});

test('completed public assistant message restores without waiting for idle', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx();
  await setup(imageGuard, fixture.ctx);
  await fixture.sessionHooks.get('prompt')(event([{ path: 'complete.png' }]));
  await imageGuard.handleSessionEvent(fixture.ctx, {
    type: 'message.updated',
    properties: {
      sessionID: 'sess-image-1',
      info: { role: 'assistant', agent: 'vision', time: { completed: Date.now() } },
    },
  });
  assert.equal(fixture.agents.get('sess-image-1'), 'openagent');
});

test('setup consumes the generated SSE result stream and restores from its lifecycle event', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx({ eventApi: false });
  let release;
  const ready = new Promise((resolve) => { release = resolve; });
  fixture.ctx.event = {
    subscribe: async () => ({
      stream: {
        async *[Symbol.asyncIterator]() {
          await ready;
          yield {
            id: 'evt-stream-idle',
            type: 'session.idle',
            data: { sessionID: 'sess-image-1' },
          };
        },
      },
    }),
  };

  await setup(imageGuard, fixture.ctx);
  await fixture.sessionHooks.get('prompt')(event([{ path: 'stream.png' }]));
  assert.equal(fixture.agents.get('sess-image-1'), 'vision');
  release();
  for (let attempt = 0; attempt < 20 && fixture.agents.get('sess-image-1') === 'vision'; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.equal(fixture.agents.get('sess-image-1'), 'openagent');
});

test('native location envelope restores the prior agent', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx();
  await setup(imageGuard, fixture.ctx);
  await fixture.sessionHooks.get('prompt')(event([{ path: 'envelope.png' }]));
  await imageGuard.handleSessionEvent(fixture.ctx, {
    location: { directory: root },
    data: { id: 'evt-envelope', type: 'session.idle', data: { sessionID: 'sess-image-1' } },
  });
  assert.equal(fixture.agents.get('sess-image-1'), 'openagent');
});

test('native durable event data shape restores the prior agent', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx();
  await setup(imageGuard, fixture.ctx);
  await fixture.sessionHooks.get('prompt')(event([{ path: 'durable.png' }]));
  await imageGuard.handleSessionEvent(fixture.ctx, {
    id: 'evt-idle',
    type: 'session.idle',
    data: { sessionID: 'sess-image-1' },
  });
  assert.equal(fixture.agents.get('sess-image-1'), 'openagent');
});

test('legacy server event lifecycle restores with the OpenCode client payload shape', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const calls = [];
  const handler = await imageGuard.default.server({
    client: {
      session: {
        get: async () => ({ data: { agent: 'openagent' } }),
        switchAgent: async (payload) => calls.push(payload),
      },
    },
  });
  const ctx = makeCtx({ eventApi: false });
  await imageGuard.routeImagePrompt(ctx.ctx, event([{ path: 'legacy.png' }]));
  await handler.event({ event: { type: 'session.idle', properties: { sessionID: 'sess-image-1' } } });
  assert.deepEqual(calls, [{
    path: { sessionID: 'sess-image-1' },
    body: { agent: 'openagent' },
  }]);
});

test('legacy server restoration uses the generated transport when switchAgent is absent', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const calls = [];
  const handler = await imageGuard.default.server({
    client: {
      session: {
        _client: { post: async (payload) => calls.push(payload) },
      },
    },
  });
  const ctx = makeCtx({ eventApi: false });
  await imageGuard.routeImagePrompt(ctx.ctx, event([{ path: 'legacy-transport.png' }]));
  await handler.event({ event: { type: 'session.idle', properties: { sessionID: 'sess-image-1' } } });
  assert.deepEqual(calls, [{
    url: '/api/session/{sessionID}/agent',
    path: { sessionID: 'sess-image-1' },
    body: { agent: 'openagent' },
    headers: { 'Content-Type': 'application/json' },
  }, {
    url: '/api/session/{sessionID}/model',
    path: { sessionID: 'sess-image-1' },
    body: { model: { providerID: 'dashscope', id: 'glm-5.3', variant: 'default' } },
    headers: { 'Content-Type': 'application/json' },
  }]);
});

test('native 2.0.19 drain events session.execution.* restore agent and model', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  for (const type of ['session.execution.succeeded', 'session.execution.failed', 'session.execution.interrupted']) {
    const fixture = makeCtx();
    await setup(imageGuard, fixture.ctx);
    await fixture.sessionHooks.get('prompt')(event([{ path: 'drain.png' }]));
    assert.equal(fixture.agents.get('sess-image-1'), 'vision');
    await fixture.emit(type);
    assert.equal(fixture.agents.get('sess-image-1'), 'openagent', type);
    assert.deepEqual(fixture.models.get('sess-image-1'), fixture.initialModel, type);
  }
});

test('switchModel failure rolls the session back and withholds the images', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx({ switchModelError: new Error('model endpoint down') });
  await setup(imageGuard, fixture.ctx);
  const shared = event([{ name: 'SCREEN.PNG', uri: 'file:///tmp/SCREEN.PNG' }], 'Look at this.');

  await fixture.sessionHooks.get('prompt')(shared);

  assert.equal(shared.metadata.imageGuardVisionRoute, 'failed');
  assert.equal(shared.metadata.imageGuardImagesWithheld, true);
  assert.deepEqual(shared.prompt.files, []);
  assert.equal(fixture.agents.get('sess-image-1'), 'openagent', 'half-applied route must not leak');
  assert.deepEqual(fixture.models.get('sess-image-1'), fixture.initialModel);
  assert.deepEqual(fixture.switches, [
    { sessionID: 'sess-image-1', agent: 'vision' },
    { sessionID: 'sess-image-1', agent: 'openagent' },
  ]);
});

test('builds without switchModel still route agent-only and keep the attachment', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx({ modelApi: false });
  await setup(imageGuard, fixture.ctx);
  const shared = event([{ path: 'agent-only.png' }]);

  await fixture.sessionHooks.get('prompt')(shared);

  assert.deepEqual(fixture.switches, [{ sessionID: 'sess-image-1', agent: 'vision' }]);
  assert.deepEqual(fixture.modelSwitches, []);
  assert.equal(shared.metadata.imageGuardVisionRoute, 'vision');
  assert.equal(shared.metadata.imageGuardImagesWithheld, undefined);
  await fixture.emit('session.idle');
  assert.equal(fixture.agents.get('sess-image-1'), 'openagent');
});

test('text prompt heals a session stranded on vision after a plugin restart', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const stranded = makeCtx({ initialAgent: 'vision' });
  await setup(imageGuard, stranded.ctx);
  await stranded.sessionHooks.get('prompt')(event([], 'plain text question'));
  assert.deepEqual(stranded.switches, [{ sessionID: 'sess-image-1', agent: 'openagent' }]);

  const healthy = makeCtx();
  await setup(imageGuard, healthy.ctx);
  await healthy.sessionHooks.get('prompt')(event([], 'plain text question'));
  assert.deepEqual(healthy.switches, [], 'a coordinator session must not be touched');
});

test('a session stranded on vision after restart restores to the coordinator, not to vision', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const fixture = makeCtx({ initialAgent: 'vision' });
  await setup(imageGuard, fixture.ctx);
  await fixture.sessionHooks.get('prompt')(event([{ path: 'stranded.png' }]));
  assert.equal(fixture.agents.get('sess-image-1'), 'vision');
  await fixture.emit('session.idle');
  assert.equal(fixture.agents.get('sess-image-1'), 'openagent', 'captured previous agent must not be vision itself');
});

test('registration failures do not prevent the other native hook from activating', async () => {
  const imageGuard = await load('plugin/image-guard.js');
  const toolHooks = new Map();
  const ctx = {
    session: {
      hook: async () => { throw new Error('session hook unavailable'); },
      switchAgent: async () => {},
    },
    tool: {
      hook: async (name, fn) => {
        toolHooks.set(name, fn);
        return () => {};
      },
    },
  };
  const dispose = await setup(imageGuard, ctx);
  assert.equal(typeof toolHooks.get('execute.before'), 'function');
  await dispose();
});
