// OpenCode Image-Guard Plugin — routes attached images to a vision agent and
// stops text-only agents from reading image files directly.
//
// OpenCode 2.0.19 runs the native session `prompt` hook before prompt
// materialization. That is the only safe point to switch the current turn to an
// image-capable agent. The legacy/server and native tool hooks remain as a
// second line of defence for explicit read calls made by text-only agents.

/** Agents whose models can actually see images. */
export const IMAGE_READERS = new Set(['vision', 'uitester']);

const IMAGE_EXTENSIONS = 'png|jpe?g|gif|webp|bmp|avif|tiff?|svg|heic|heif';
const IMAGE_PATH_RE = new RegExp(`\\.(${IMAGE_EXTENSIONS})(?=$|[?#])`, 'i');
const IMAGE_DATA_RE = /^data:image\/(?:png|jpe?g|gif|webp|bmp|avif|tiff?|svg\+xml|heic|heif)(?:[;,]|$)/i;
const READ_TOOLS = new Set(['read', 'Read']);
// Native 2.0.19 drains end on session.execution.*; public/legacy surfaces and
// older builds report session.idle / session.error. All are drain boundaries.
const TERMINAL_EVENT_TYPES = new Set([
  'session.idle',
  'session.error',
  'session.execution.succeeded',
  'session.execution.failed',
  'session.execution.interrupted',
]);
const ROUTE_MARKER = 'imageGuardVisionRoute';
const COORDINATOR_MARKER = 'imageGuardCoordinatorRoute';
const WITHHELD_MARKER = 'imageGuardImagesWithheld';
const FALLBACK_AGENT = 'openagent';
// The model pinned in agents/vision.md. switchAgent does NOT touch the session's
// model override, so without an explicit model switch the "vision" turn runs on
// the coordinator's text-only model (caught live: glm-5.3 hunted the attachment
// on disk instead of seeing it). Keep in sync with agents/vision.md frontmatter.
const VISION_MODEL = { providerID: 'opencode-free-1', id: 'space-bunny-free' };
const SHARED_STATE_KEY = Symbol.for('code-atlas.image-guard.state.v4');

// Source and synchronized project/global copies are separate ES modules but run
// in one OpenCode process. Agent ownership must therefore live on globalThis,
// not in module-local maps.
const sharedState = (globalThis[SHARED_STATE_KEY] ??= {
  sessions: new Map(),
  locks: new Map(),
  owners: 0,
});

const GUIDANCE =
  '[IMAGE-GUARD] Изображения текстовой моделью не читаются: провайдер молча отбрасывает картинку, ' +
  'и модель прифантазирует описание по имени файла (пойманный случай — выдуманный «мобильный тёмный чат» ' +
  'при светлом desktop-скрине). Делегируй чтение субагенту с image-моделью: ' +
  'task(vision, «прочитай изображение: <путь>; опиши текст и проблемы фактами»). ' +
  'Не описывай изображение сам — даже частично.';

export const WITHHELD_EXPLANATION =
  '[IMAGE-GUARD] Вложение-изображение скрыто: переключение текущего запроса на image-capable агента vision не удалось. ' +
  'Текстовая модель не получила изображение и не должна описывать его. Повторите отправку после проверки агента vision.';

/** A prompt attachment is an image if any supported attachment locator says so. */
export function isImageAttachment(file) {
  if (typeof file === 'string') return IMAGE_DATA_RE.test(file.trim()) || IMAGE_PATH_RE.test(file.trim());
  if (!file || typeof file !== 'object') return false;

  for (const key of ['name', 'filename', 'fileName', 'path', 'uri', 'url', 'href', 'source', 'data']) {
    const value = file[key];
    if (typeof value !== 'string') continue;
    const candidate = value.trim();
    if (IMAGE_DATA_RE.test(candidate) || IMAGE_PATH_RE.test(candidate)) return true;
  }
  return false;
}

/** Shared check: returns the guidance text to throw, or null when allowed. */
export function imageBlockReason({ tool, agent, filePath } = {}) {
  if (!READ_TOOLS.has(String(tool ?? ''))) return null;
  if (typeof filePath !== 'string' || !IMAGE_PATH_RE.test(filePath.trim())) return null;
  if (IMAGE_READERS.has(String(agent ?? ''))) return null;
  return GUIDANCE;
}

function unwrapData(value) {
  return value?.data ?? value;
}

function sessionAgent(value) {
  const session = unwrapData(value);
  return typeof session?.agent === 'string' && session.agent ? session.agent : FALLBACK_AGENT;
}

/** The session's explicit model override, or null when the record has none. */
function sessionModel(value) {
  const model = unwrapData(value)?.model;
  if (!model || typeof model.providerID !== 'string' || typeof model.id !== 'string') return null;
  const picked = { providerID: model.providerID, id: model.id };
  if (typeof model.variant === 'string') picked.variant = model.variant;
  return picked;
}

function withSessionLock(sessionID, operation) {
  const previous = sharedState.locks.get(sessionID) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  sharedState.locks.set(sessionID, current);
  return current.finally(() => {
    if (sharedState.locks.get(sessionID) === current) sharedState.locks.delete(sessionID);
  });
}

async function currentSelection(ctx, sessionID) {
  const fallback = { agent: FALLBACK_AGENT, model: null };
  if (typeof ctx?.session?.get !== 'function') return fallback;
  try {
    const session = await ctx.session.get({ sessionID });
    return { agent: sessionAgent(session), model: sessionModel(session) };
  } catch {
    return fallback;
  }
}

/** Switch the session model to the vision pin; false when the API is absent. */
async function switchVisionModel(ctx, sessionID) {
  if (typeof ctx?.session?.switchModel !== 'function') return false;
  await ctx.session.switchModel({ sessionID, model: VISION_MODEL });
  return true;
}

/** Put back exactly what the session had before the guard touched it. */
async function restoreSelection(ctx, sessionID, state) {
  await ctx.session.switchAgent({ sessionID, agent: state.previousAgent });
  if (state.previousModel && typeof ctx.session.switchModel === 'function') {
    await ctx.session.switchModel({ sessionID, model: state.previousModel });
  }
}

function withholdImages(event, files) {
  const prompt = event.prompt;
  prompt.files = files.filter((file) => !isImageAttachment(file));
  prompt.text = `${WITHHELD_EXPLANATION}${prompt.text ? `\n\n${prompt.text}` : ''}`;
  event.metadata[ROUTE_MARKER] = 'failed';
  event.metadata[WITHHELD_MARKER] = true;
}

/** Restore the coordinator only at a terminal session boundary. */
export async function restoreSessionAgent(ctx, sessionID) {
  if (!sessionID) return false;
  return withSessionLock(sessionID, async () => {
    const state = sharedState.sessions.get(sessionID);
    if (!state || state.pending > 0 || state.restoring) return false;

    state.restoring = true;
    try {
      await restoreSelection(ctx, sessionID, state);
      sharedState.sessions.delete(sessionID);
      return true;
    } catch (error) {
      // Keep state retryable: another idle/error event or plugin cleanup can
      // restore it. The rejection is propagated so real restore failures are
      // observable rather than silently swallowed.
      state.lastRestoreError = error;
      throw error;
    } finally {
      state.restoring = false;
    }
  });
}

/**
 * Route an image-bearing prompt before OpenCode materializes it. The metadata
 * marker is placed before awaiting so global and project copies sharing the
 * same event cannot race and switch twice. Session state remains on vision
 * until the drain reaches idle/error; this deliberately covers every provider
 * step in a tool-using turn and every image prompt queued in that drain.
 */
export async function routeImagePrompt(ctx, event) {
  const prompt = event?.prompt;
  const files = Array.isArray(prompt?.files) ? prompt.files : [];
  const hasImages = files.some(isImageAttachment);
  const sessionID = event?.sessionID;
  const active = sessionID ? sharedState.sessions.get(sessionID) : undefined;
  if (!hasImages && !active) {
    // A plugin restart loses in-memory ownership. A session stranded on vision
    // by the previous run would keep answering plain text through the image
    // agent, so heal it back to the coordinator on the next text prompt.
    if (sessionID && typeof ctx?.session?.switchAgent === 'function') {
      try {
        if ((await currentSelection(ctx, sessionID)).agent === 'vision') {
          await ctx.session.switchAgent({ sessionID, agent: FALLBACK_AGENT });
        }
      } catch {
        // Best effort: the next text prompt retries.
      }
    }
    return;
  }

  const metadata = event.metadata && typeof event.metadata === 'object' ? event.metadata : (event.metadata = {});

  // A text-only prompt queued while vision owns the persistent session setting
  // must be materialized under the coordinator. This does not affect the
  // already-materialized in-flight vision turn; it only selects subsequent
  // provider turns, which is precisely switchAgent's 2.0.19 contract.
  if (!hasImages) {
    if (metadata[COORDINATOR_MARKER]) return;
    metadata[COORDINATOR_MARKER] = 'switching';
    try {
      await withSessionLock(sessionID, async () => {
        const state = sharedState.sessions.get(sessionID);
        if (!state) return;
        await restoreSelection(ctx, sessionID, state);
      });
      metadata[COORDINATOR_MARKER] = 'restored';
    } catch (error) {
      metadata[COORDINATOR_MARKER] = 'failed';
      throw error;
    }
    return;
  }

  if (metadata[ROUTE_MARKER]) return;
  metadata[ROUTE_MARKER] = 'switching';

  try {
    await withSessionLock(sessionID, async () => {
      let state = sharedState.sessions.get(sessionID);
      if (!state) {
        const selection = await currentSelection(ctx, sessionID);
        state = {
          // A session stranded on vision (plugin restarted mid-turn) must not
          // capture 'vision' as the coordinator to restore afterwards.
          previousAgent: selection.agent === 'vision' ? FALLBACK_AGENT : selection.agent,
          previousModel: selection.model,
          pending: 0,
          messages: new Set(),
          restoring: false,
        };
        sharedState.sessions.set(sessionID, state);
      }

      const messageKey = event.messageID ?? event;
      if (!state.messages.has(messageKey)) {
        state.messages.add(messageKey);
        state.pending += 1;
      }

      try {
        // Keep this payload exact: it is the supported pre-materialization API.
        await ctx.session.switchAgent({ sessionID, agent: 'vision' });
        // switchAgent leaves the session model override untouched; without this
        // the vision turn would run on the coordinator's text-only model.
        await switchVisionModel(ctx, sessionID);
      } catch (error) {
        state.messages.delete(messageKey);
        state.pending = Math.max(0, state.pending - 1);
        if (state.pending === 0) sharedState.sessions.delete(sessionID);
        // A half-applied route must not leak: put the session back before the
        // caller withholds the images.
        try {
          await restoreSelection(ctx, sessionID, state);
        } catch {
          // Best-effort; the terminal-event path retries restoration.
        }
        throw error;
      }
    });
    metadata[ROUTE_MARKER] = 'vision';
  } catch (error) {
    // Supported pre-materialization mutation: withhold image files but preserve
    // distinguishable non-images and tell the text-only model exactly why.
    withholdImages(event, files);
  }
}

/** Consume OpenCode lifecycle events exposed by the legacy server event hook. */
export async function handleSessionEvent(ctx, input) {
  let event = input?.event ?? input;
  // Native subscriptions may include a location envelope whose `data` is the
  // event; legacy server hooks wrap it in `event` instead.
  if (!event?.type && event?.data?.type) event = event.data;
  // Native ctx.event.subscribe yields durable events with `data`; the legacy
  // server hook yields public SDK events with `properties`.
  const details = event?.properties ?? event?.data;
  const sessionID = details?.sessionID;
  if (!sessionID) return;

  const state = sharedState.sessions.get(sessionID);
  if (!state) return;

  if (event.type === 'session.next.prompt.admitted') {
    const messageID = details?.messageID;
    if (messageID && state.messages.has(messageID)) {
      state.messages.delete(messageID);
      state.pending = Math.max(0, state.pending - 1);
    }
    return;
  }

  // Public plugin events expose completion on the assistant message. A completed
  // message is the routed turn boundary (unlike an intermediate step.ended).
  if (event.type === 'message.updated') {
    const info = details?.info;
    if (info?.role !== 'assistant' || !info?.time?.completed) return;
    if (info.agent && info.agent !== 'vision') return;
    state.pending = 0;
    state.messages.clear();
    await restoreSessionAgent(ctx, sessionID);
    return;
  }

  // step.ended is intentionally not terminal: tools may cause another provider
  // step. The drain boundary in native 2.0.19 is session.execution.*; legacy and
  // public surfaces report session.idle / session.error instead. Accept all of
  // them — restoration is idempotent per session state.
  if (TERMINAL_EVENT_TYPES.has(event.type)) {
    state.pending = 0;
    state.messages.clear();
    await restoreSessionAgent(ctx, sessionID);
  }
}

async function ImageGuard({ client } = {}) {
  const session = {
    get: async ({ sessionID }) => client?.session?.get
      ? client.session.get({ path: { id: sessionID } })
      : undefined,
    switchAgent: async ({ sessionID, agent }) => {
      // The legacy plugin client does not declare this 2.x endpoint, but it
      // exposes the generated transport. Calling that transport keeps the
      // lifecycle event hook on the supported server plugin surface while
      // using the exact 2.0.19 route and body.
      if (typeof client?.session?.switchAgent === 'function') {
        return client.session.switchAgent({
          path: { sessionID },
          body: { agent },
        });
      }
      // Promise plugins are currently passed the legacy SDK client. Its session
      // resource still exposes the generated transport, so use the documented
      // v2 route until switchAgent is added to that legacy resource.
      if (typeof client?.session?._client?.post === 'function') {
        return client.session._client.post({
          url: '/api/session/{sessionID}/agent',
          path: { sessionID },
          body: { agent },
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error('session.switchAgent unavailable');
    },
  };

  // Exposed only when a transport exists: an absent switchModel means "best effort
  // agent-only routing", while a present-but-failing one rolls back and withholds.
  if (typeof client?.session?.switchModel === 'function' || typeof client?.session?._client?.post === 'function') {
    session.switchModel = async ({ sessionID, model }) => {
      if (typeof client?.session?.switchModel === 'function') {
        return client.session.switchModel({ path: { sessionID }, body: { model } });
      }
      return client.session._client.post({
        url: '/api/session/{sessionID}/model',
        path: { sessionID },
        body: { model },
        headers: { 'Content-Type': 'application/json' },
      });
    };
  }

  return {
    event: async (input) => handleSessionEvent({ session }, input),
    'tool.execute.before': async (input, output) => {
      try {
        const args = output?.args ?? {};
        const reason = imageBlockReason({
          tool: input?.tool,
          agent: input?.agent,
          filePath: args.file_path ?? args.path ?? args.filePath,
        });
        if (reason) throw new Error(reason);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('[IMAGE-GUARD]')) throw e;
        // NEVER break the session on our own bugs
      }
    },
  };
}

function disposerFor(registration) {
  if (typeof registration === 'function') return registration;
  if (typeof registration?.dispose === 'function') return () => registration.dispose();
  return async () => {};
}

/** OpenCode 2.x native registration. Always resolves to a dispose function. */
async function setup(ctx) {
  const disposers = [];
  const owner = Symbol('image-guard-owner');
  const EVENT_LOOP_KEY = Symbol.for('code-atlas.image-guard.event-loop.v1');
  sharedState.owners ??= new Set();
  if (!(sharedState.owners instanceof Set)) sharedState.owners = new Set();
  sharedState.owners.add(owner);

  // Session and tool APIs are optional and independent across builds.
  if (typeof ctx?.session?.hook === 'function' && typeof ctx?.session?.switchAgent === 'function') {
    try {
      const reg = await ctx.session.hook('prompt', (event) => routeImagePrompt(ctx, event));
      disposers.push(disposerFor(reg));
    } catch {
      // A missing/unsupported registration API must not disable plugin loading.
    }

    for (const name of ['idle', 'error']) {
      try {
        const reg = await ctx.session.hook(name, (event) => handleSessionEvent(ctx, {
          type: `session.${name}`,
          data: event?.data ?? event?.properties ?? event,
        }));
        disposers.push(disposerFor(reg));
      } catch {
        // Hook availability differs across 2.x builds; each is independent.
      }
    }
  }

  if (typeof ctx?.event?.subscribe === 'function' && typeof ctx?.session?.switchAgent === 'function') {
    try {
      // Promise plugins receive an AsyncIterable subscription, not a callback
      // registration. Run exactly one process-shared consumer for duplicate
      // global/project copies; abort it when the last owner is disposed.
      if (!globalThis[EVENT_LOOP_KEY]) {
        const controller = new AbortController();
        const loop = (async () => {
          const subscription = await ctx.event.subscribe({ signal: controller.signal });
          // The generated 2.0.19 SDK resolves SSE subscriptions to
          // ServerSentEventsResult ({ stream }), while some native facades expose
          // the AsyncIterable directly. Accept both shapes.
          const events = subscription?.stream ?? subscription;
          if (!events || typeof events[Symbol.asyncIterator] !== 'function') return;
          for await (const event of events) {
            try {
              await handleSessionEvent(ctx, event);
            } catch {
              // Keep consuming so a later idle/error can retry restoration.
            }
          }
        })();
        loop.catch(() => {});
        globalThis[EVENT_LOOP_KEY] = { controller, loop };
      }
    } catch {
      // Legacy server.event remains available when native subscription is absent.
    }
  }

  if (typeof ctx?.tool?.hook === 'function') {
    try {
      const reg = await ctx.tool.hook('execute.before', async (payload) => {
        try {
          const input = payload?.input ?? {};
          const reason = imageBlockReason({
            tool: payload?.tool,
            agent: payload?.agent,
            filePath: input.path ?? input.file_path ?? input.filePath,
          });
          if (reason) throw new Error(reason);
        } catch (e) {
          if (e instanceof Error && e.message.startsWith('[IMAGE-GUARD]')) throw e;
        }
      });
      disposers.push(disposerFor(reg));
    } catch {
      // Keep any independently registered session hook alive.
    }
  }

  let disposed = false;
  return async () => {
    if (disposed) return;
    disposed = true;
    for (const dispose of disposers.reverse()) {
      try {
        await dispose();
      } catch {}
    }

    sharedState.owners.delete(owner);
    if (sharedState.owners.size === 0 && typeof ctx?.session?.switchAgent === 'function') {
      const eventLoop = globalThis[EVENT_LOOP_KEY];
      if (eventLoop) {
        eventLoop.controller.abort();
        delete globalThis[EVENT_LOOP_KEY];
      }
      const failures = [];
      for (const sessionID of [...sharedState.sessions.keys()]) {
        const state = sharedState.sessions.get(sessionID);
        if (!state) continue;
        state.pending = 0;
        state.messages.clear();
        try {
          await restoreSessionAgent(ctx, sessionID);
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length) throw failures[0];
    }
  };
}

export { ImageGuard, VISION_MODEL };
export default { id: 'image-guard', server: ImageGuard, setup };
