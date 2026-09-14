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

export default async function Telemetry({ directory }) {
  const logFile = path.join(directory || process.cwd(), '.opencode', 'agent-journal.jsonl');

  // Bounded growth: when the journal exceeds MAX_BYTES, keep only the tail.
  // statSync per append is cheap — tool events are not a hot path.
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  const KEEP_BYTES = 2 * 1024 * 1024; // keep last 2 MB on rotation

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

  // opencode loads this plugin twice when it exists in BOTH the global config
  // (~/.config/opencode/plugin) and the project (.opencode/plugin). Both copies
  // receive the same event, which would write every record twice and double every
  // downstream count. Drop a record that repeats within a few milliseconds.
  const DEDUPE_KEY = Symbol.for('opencode.telemetry.dedupe');
  const dedupe = (globalThis[DEDUPE_KEY] ??= new Map());
  const DEDUPE_WINDOW_MS = 50;
  const DEDUPE_MAX = 4000;

  const isDuplicate = (record) => {
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
  };

  const append = (record) => {
    try {
      if (isDuplicate(record)) return;
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      rotateIfNeeded();
      fs.appendFileSync(logFile, JSON.stringify(record) + '\n', 'utf8');
    } catch {
      // swallow: telemetry is best-effort
    }
  };

  return {
    'tool.execute.after': async (input) => {
      try {
        const tool = input?.tool;
        if (!tool) return;
        const record = {
          ts: new Date().toISOString(),
          session: input?.sessionID ?? null,
          tool
        };
        // Task tool = orchestrator delegation: capture the chosen subagent.
        if (tool === 'task') {
          record.type = 'delegate';
          record.agent = input?.args?.subagent_type ?? 'unknown';
        }
        append(record);
      } catch {
        // swallow
      }
    },
    event: async ({ event }) => {
      try {
        if (event?.type === 'session.idle') {
          append({
            ts: new Date().toISOString(),
            type: 'session_idle',
            session: event.properties?.sessionID ?? null
          });
        }
        // Token usage per completed assistant message (dedup by msg id downstream).
        if (event?.type === 'message.updated') {
          const info = event.properties?.info;
          const tokens = info?.tokens;
          if (info?.role === 'assistant' && tokens && info.time?.completed) {
            append({
              ts: new Date().toISOString(),
              type: 'tokens',
              msg: info.id ?? null,
              session: info.sessionID ?? null,
              input: tokens.input ?? 0,
              output: tokens.output ?? 0,
              cache: (tokens.cache?.read ?? 0) + (tokens.cache?.write ?? 0)
            });
          }
        }
        // Tool failures (dedup by part id downstream).
        if (event?.type === 'message.part.updated') {
          const part = event.properties?.part;
          if (part?.type === 'tool' && part.state?.status === 'error') {
            append({
              ts: new Date().toISOString(),
              type: 'tool_error',
              part: part.id ?? null,
              session: part.sessionID ?? null,
              tool: part.tool ?? 'unknown'
            });
          }
        }
      } catch {
        // swallow
      }
    }
  };
}
