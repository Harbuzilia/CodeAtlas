// OpenCode Telemetry Plugin — append-only routing/usage journal.
// Records every tool execution and agent delegation to
// .opencode/agent-journal.jsonl for offline analysis by
// `npm run telemetry` (scripts/routing-telemetry.mjs).
//
// Design constraints:
// - NEVER throw: telemetry must not break agent sessions.
// - Append-only JSONL: cheap, stream-parseable, no locks.
// - No network, no external deps.

import fs from 'node:fs';
import path from 'node:path';

// Bounded growth: when the journal exceeds MAX_BYTES, keep only the tail.
// statSync per append is cheap — tool events are not a hot path.
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const KEEP_BYTES = 2 * 1024 * 1024; // keep last 2 MB on rotation

// opencode loads this plugin twice when it exists in BOTH the global config
// (~/.config/opencode/plugin) and the project (.opencode/plugin). Both copies
// receive the same event, which would write every record twice and double every
// downstream count. Drop a record that repeats within a few milliseconds.
const DEDUPE_KEY = Symbol.for('opencode.telemetry.dedupe');
const dedupe = (globalThis[DEDUPE_KEY] ??= new Map());
const DEDUPE_WINDOW_MS = 50;
const DEDUPE_MAX = 4000;

// Task (delegation) wall-clock timing: the task tool part enters "running"
// (event) and tool.execute.after fires when it returns. Serial routes guarantee
// one task per root session at a time, so a plain session -> startTime map is
// exact enough. Shared across double-loaded plugin copies.
const STARTS_KEY = Symbol.for('opencode.telemetry.taskStarts');
const taskStarts = (globalThis[STARTS_KEY] ??= new Map());
const STARTS_MAX = 200;

function isDuplicate(record) {
  const { ts, ...fields } = record;
  const key = JSON.stringify(fields);
  const now = Date.now();
  const prev = dedupe.get(key);
  if (prev !== undefined && now - prev < DEDUPE_WINDOW_MS) return true;
  dedupe.set(key, now);
  if (dedupe.size > DEDUPE_MAX) {
    for (const [k, t] of dedupe) {
      if (now - t >= DEDUPE_WINDOW_MS) dedupe.delete(k);
    }
  }
  return false;
}

/** Append-only JSONL journal writer for one directory. Never throws. */
function createJournal(directory) {
  const logFile = path.join(directory || process.cwd(), '.opencode', 'agent-journal.jsonl');

  const rotateIfNeeded = () => {
    try {
      const size = fs.statSync(logFile).size;
      if (size <= MAX_BYTES) return;
      const fd = fs.openSync(logFile, 'r');
      try {
        const buf = Buffer.alloc(KEEP_BYTES);
        fs.readSync(fd, buf, 0, KEEP_BYTES, size - KEEP_BYTES);
        const tail = buf.toString('utf8');
        const nl = tail.indexOf('\n'); // drop partial first line
        fs.writeFileSync(logFile, nl >= 0 ? tail.slice(nl + 1) : tail, 'utf8');
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      // swallow: rotation is best-effort
    }
  };

  return function append(record) {
    try {
      if (isDuplicate(record)) return;
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      rotateIfNeeded();
      fs.appendFileSync(logFile, JSON.stringify(record) + '\n', 'utf8');
    } catch {
      // swallow: telemetry is best-effort
    }
  };
}

function markTaskStart(sessionID) {
  if (!sessionID) return;
  taskStarts.set(sessionID, Date.now());
  if (taskStarts.size > STARTS_MAX) taskStarts.delete(taskStarts.keys().next().value);
}

function takeTaskStart(sessionID) {
  if (!sessionID) return undefined;
  const startedAt = taskStarts.get(sessionID);
  taskStarts.delete(sessionID);
  return startedAt;
}

/** tool.execute.after payload -> journal record (1.x and 2.x shapes). */
function toolRecord(input) {
  const tool = input?.tool;
  if (!tool) return null;
  const record = {
    ts: new Date().toISOString(),
    session: input?.sessionID ?? null,
    tool,
  };
  // Task tool = orchestrator delegation: capture the chosen subagent
  // and the wall-clock duration of the delegated work.
  if (tool === 'task') {
    record.type = 'delegate';
    record.agent = input?.args?.subagent_type ?? input?.input?.subagent_type ?? 'unknown';
    const startedAt = takeTaskStart(record.session);
    if (startedAt) record.durationMs = Date.now() - startedAt;
  }
  return record;
}

/** Native/legacy event envelope -> journal records (array, possibly empty). */
function eventRecords(raw) {
  let event = raw?.event ?? raw;
  if (!event?.type && event?.data?.type) event = event.data;
  const details = event?.properties ?? event?.data ?? {};
  const records = [];
  const now = () => new Date().toISOString();

  // Drain boundaries: canonical 2.x names plus the deprecated 1.x one.
  if (event.type === 'session.execution.succeeded' || event.type === 'session.execution.failed'
    || event.type === 'session.execution.interrupted' || event.type === 'session.idle') {
    records.push({ ts: now(), type: 'session_idle', session: details?.sessionID ?? null });
  }

  // Token usage per completed assistant message (dedup by msg id downstream).
  if (event.type === 'message.updated') {
    const info = details?.info;
    const tokens = info?.tokens;
    if (info?.role === 'assistant' && tokens && info.time?.completed) {
      records.push({
        ts: now(),
        type: 'tokens',
        msg: info.id ?? null,
        session: info.sessionID ?? null,
        input: tokens.input ?? 0,
        output: tokens.output ?? 0,
        cache: (tokens.cache?.read ?? 0) + (tokens.cache?.write ?? 0),
      });
    }
  }

  // Tool failures (dedup by part id downstream) + task start markers.
  if (event.type === 'message.part.updated') {
    const part = details?.part;
    if (part?.type === 'tool' && part.tool === 'task' && part.state?.status === 'running') {
      markTaskStart(part.sessionID);
      records.push({ ts: now(), type: 'delegate_start', part: part.id ?? null, session: part.sessionID ?? null });
    }
    if (part?.type === 'tool' && part.state?.status === 'error') {
      records.push({
        ts: now(),
        type: 'tool_error',
        part: part.id ?? null,
        session: part.sessionID ?? null,
        tool: part.tool ?? 'unknown',
      });
    }
  }
  return records;
}

export async function Telemetry({ directory } = {}) {
  const append = createJournal(directory);

  return {
    'tool.execute.after': async (input) => {
      try {
        const record = toolRecord(input);
        if (record) append(record);
      } catch {
        // swallow
      }
    },
    event: async ({ event }) => {
      try {
        for (const record of eventRecords(event)) append(record);
      } catch {
        // swallow
      }
    },
  };
}

function disposerFor(registration) {
  if (typeof registration === 'function') return registration;
  if (typeof registration?.dispose === 'function') return () => registration.dispose();
  return async () => {};
}

const EVENT_LOOP_KEY = Symbol.for('opencode.telemetry.event-loop.v1');
const OWNERS_KEY = Symbol.for('opencode.telemetry.owners');

/** OpenCode 2.x native registration. Always resolves to a dispose function. */
async function setup(ctx) {
  const disposers = [];
  const owners = (globalThis[OWNERS_KEY] ??= new Set());
  const owner = Symbol('telemetry-owner');
  owners.add(owner);

  const directory = ctx?.location?.directory ?? ctx?.directory ?? process.cwd();
  const append = createJournal(directory);

  if (typeof ctx?.tool?.hook === 'function') {
    try {
      const reg = await ctx.tool.hook('execute.after', async (payload) => {
        try {
          const record = toolRecord(payload);
          if (record) append(record);
        } catch {
          // swallow: telemetry is best-effort
        }
      });
      disposers.push(disposerFor(reg));
    } catch {
      // A missing tool-hook API must not disable the event journal.
    }
  }

  // One process-shared consumer for duplicate global/project plugin copies.
  if (typeof ctx?.event?.subscribe === 'function' && !globalThis[EVENT_LOOP_KEY]) {
    const controller = new AbortController();
    const loop = (async () => {
      const subscription = await ctx.event.subscribe({ signal: controller.signal });
      // Generated 2.0.19 SDK resolves SSE to { stream }; accept both shapes.
      const events = subscription?.stream ?? subscription;
      if (!events || typeof events[Symbol.asyncIterator] !== 'function') return;
      for await (const raw of events) {
        try {
          for (const record of eventRecords(raw)) append(record);
        } catch {
          // Keep consuming.
        }
      }
    })();
    loop.catch(() => {});
    globalThis[EVENT_LOOP_KEY] = { controller, loop };
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
    owners.delete(owner);
    if (owners.size === 0) {
      const eventLoop = globalThis[EVENT_LOOP_KEY];
      if (eventLoop) {
        eventLoop.controller.abort();
        delete globalThis[EVENT_LOOP_KEY];
      }
    }
  };
}

// opencode 2.x plugin format: the default export must be an object with an id
// and a server() factory - a bare function is rejected on load
// (PluginModule.LoadError). setup() is the live 2.x path: native tool hook plus
// one shared event consumer; server() keeps the 1.x harness served.
export { createJournal, toolRecord, eventRecords };
export default { id: "telemetry", server: Telemetry, setup };
