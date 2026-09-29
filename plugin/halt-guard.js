// OpenCode Halt-Guard Plugin — runtime auto-continue for narrated delegation stalls
// and transient provider errors.
// Problem 1: weak models often write "передаю агенту ..." as TEXT instead of
//   calling task(). Turn ends with no tool call, session goes idle, work stops.
// Problem 2: provider throws a transient error (429/5xx/overloaded/network)
//   mid-route — session dies silently, no recovery.
// Problem 3: a task() delegation dies on a transient provider error — the whole
//   subagent run is lost and the chain stalls (subagent sessions are not
//   guarded directly, so we nudge the ROOT session to re-issue the task once).
// Problem 4 (the historical user-facing bug): a USER abort (Esc) used to look
//   like a transient error and got auto-resumed against the user's wish; worse,
//   the guard's own user-role injection cleared the abort mark, so one leaked
//   resume re-armed more of them ("stop once -> it revives -> stop again").
//   Native 2.x fixes this structurally: session.execution.interrupted carries
//   reason:"user", injections go through ctx.session.synthetic (not user-role),
//   and every backoff re-checks the abort mark before injecting.
// OpenCode 2.x runs setup(ctx) only; the legacy server factory below keeps the
// 1.x harness served. Both share one policy core and one process-wide budget
// registry (the plugin loads twice: global config + project mirror).

const TERMINAL_RE = /(Работа завершена|FAILED)\.?\s*Возвращаю управление\./;
const DELEGATION_RE = /(передаю|делегирую|делегац|передал|вызываю\s*task|task\s*\(|hand[-\s]?off\s+(?:to|→)|delegat|next\s+agent|следующ.*агент|продолж.*цепочк)/i;
// Transient provider failures — worth one bounded auto-resume.
// NOTE: "aborted" is deliberately NOT here: a user abort surfaces with the same
// wording but must never be auto-resumed (see interrupt/abort handling).
const RETRYABLE_RE = /(rate.?limit|429|overload|too many|\b5\d\d\b|timeout|timed? ?out|ECONNRESET|ETIMEDOUT|ECONNREFUSED|fetch failed|network|socket|stream)/i;
// Fatal — never auto-resume (auth, billing, hard quota). User must act.
const FATAL_RE = /(401|403|unauthorized|forbidden|invalid.{0,12}api.?key|incorrect.{0,12}api.?key|insufficient.?quota|billing|payment|permission denied)/i;

const MAX_NUDGES = 3;
const MAX_ERROR_RETRIES = 2;
// Env-overridable for tests (tests set HALT_GUARD_ERROR_BACKOFF_MS=0).
const ERROR_BACKOFF_MS = Number(process.env.HALT_GUARD_ERROR_BACKOFF_MS ?? 5000);
const MAX_MAP_SIZE = 200;
// A failed task() delegation (subagent) killed by a transient provider error
// loses the whole subagent run. One retry nudge per failed part, hard-capped
// per session — this guards the chain without feeding retry loops.
const MAX_TASK_RETRIES_PER_SESSION = 2;
// Env-overridable for tests (tests set HALT_GUARD_TASK_BACKOFF_MS=0).
const TASK_BACKOFF_MS = Number(process.env.HALT_GUARD_TASK_BACKOFF_MS ?? 3000);
// Marks guard-authored input so it never counts as "the user is back".
const GUARD_SOURCE = 'halt-guard';
const GUARD_PREFIX = '[HALT-GUARD]';
// Deprecated 1.x events and canonical 2.x events can both arrive for one
// failure; collapse repeats inside this window per session+error.
const ERROR_DEDUPE_MS = 2000;

const STATE_KEY = Symbol.for('opencode.halt-guard.state');
const EVENT_LOOP_KEY = Symbol.for('opencode.halt-guard.event-loop.v1');

function sharedState() {
  const shared = (globalThis[STATE_KEY] ??= {});
  shared.nudges ??= new Map(); // sessionID -> { count, lastMsgId }
  shared.errRetries ??= new Map();
  shared.taskRetried ??= new Set(); // part ids already nudged
  shared.sessionTaskRetries ??= new Map();
  shared.aborted ??= new Set(); // sessions the USER stopped — never revive
  shared.exhaustedNotified ??= new Set();
  shared.lastAssistant ??= new Map(); // sessionID -> { id, text, hasTool }
  shared.errorDedupe ??= new Map();
  shared.owners ??= new Set();
  return shared;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function pruneMap(map) {
  if (map.size > MAX_MAP_SIZE) {
    const toDelete = map.size - MAX_MAP_SIZE;
    let i = 0;
    for (const k of map.keys()) { if (i++ >= toDelete) break; map.delete(k); }
  }
}

function pruneSet(set) {
  if (set.size > MAX_MAP_SIZE) {
    const drop = set.size - MAX_MAP_SIZE;
    let i = 0;
    for (const k of set) { if (i++ >= drop) break; set.delete(k); }
  }
}

function errorText(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  return [err.statusCode, err.name, err.message].filter(Boolean).join(' ');
}

function isRetryableError(errObj, text) {
  if (!text || FATAL_RE.test(text)) return false;
  if (errObj && typeof errObj === 'object' && errObj.name === 'APIError') {
    return errObj.data?.isRetryable === true || RETRYABLE_RE.test(text);
  }
  return RETRYABLE_RE.test(text);
}

function partErrorText(part) {
  const err = part?.state?.error;
  const text = typeof err === 'string'
    ? err
    : [err?.name, err?.message, part?.state?.output].filter(Boolean).join(' ');
  return String(text).slice(0, 300);
}

function textOfParts(parts) {
  return (Array.isArray(parts) ? parts : [])
    .filter((p) => p?.type === 'text')
    .map((p) => p.text ?? '')
    .join('\n');
}

function nudgeText(lastText, hasDelegationSignal) {
  return hasDelegationSignal
    ? `${GUARD_PREFIX} Ты задекларировал делегацию текстом («${lastText.slice(0, 120).replace(/\n/g, ' ')}…») но не вызвал task() и сессия встала. ` +
      `Немедленно вызови task() для следующего агента в route как function call, без текста перед вызовом. ` +
      `ВАЖНО: не дублируй делегацию — если task() для этого шага уже вызывался ранее в этой сессии и вернул результат, переходи к следующему агенту route или к финальному отчёту, а не вызывай тот же task() повторно. ` +
      `Если вся цепочка завершена — заверши фразой «Работа завершена. Возвращаю управление.»`
    : `${GUARD_PREFIX} Сессия встала: есть незавершённые todos, но ты вывел только текст без task(). Продолжи route — вызови task() для следующего агента. Не дублируй уже сделанные делегации. Если всё готово — заверши фразой «Работа завершена. Возвращаю управление.»`;
}

/**
 * Policy core shared by the legacy 1.x server factory and the native 2.x setup.
 * `io` abstracts the harness differences:
 *   inject(sessionID, text) — admit guard-authored continuation (never throws)
 *   isRoot(sessionID)       — parentID guard (nudges target root sessions only)
 *   fetchLast(sessionID)    — legacy only: poll the last completed assistant
 *     message + incomplete-todo flag; native keeps a ring buffer instead.
 */
function createPolicy(io, shared = sharedState()) {
  const { nudges, errRetries, taskRetried, sessionTaskRetries, aborted, exhaustedNotified, lastAssistant, errorDedupe } = shared;

  const getNudgeState = (sid) => {
    if (!nudges.has(sid)) nudges.set(sid, { count: 0, lastMsgId: null });
    return nudges.get(sid);
  };

  // Budget exhaustion must not be silent: one final injection per stall EPISODE
  // asks the model for a closing status instead of another resume attempt. The
  // flag resets when the session recovers, so a later episode can speak again.
  const notifyExhausted = async (sid, kind) => {
    if (exhaustedNotified.has(sid)) return;
    exhaustedNotified.add(sid);
    await io.inject(
      sid,
      `${GUARD_PREFIX} Бюджет авто-продолжений исчерпан (${kind}). Не начинай новых шагов и не повторяй попытки. ` +
      `Выдай пользователю финальный статус ОДНИМ сообщением: что сделано, что осталось, какие следующие шаги нужны. Затем остановись.`,
    );
  };

  const resetEpisode = (sid) => {
    const st = getNudgeState(sid);
    st.count = 0;
    st.lastMsgId = null;
    exhaustedNotified.delete(sid);
  };

  return {
    shared,

    cleanup(sid) {
      if (!sid) return;
      nudges.delete(sid);
      errRetries.delete(sid);
      aborted.delete(sid);
      exhaustedNotified.delete(sid);
      sessionTaskRetries.delete(sid);
      lastAssistant.delete(sid);
    },

    // A REAL user message means the user is back in control. Guard-authored
    // input (synthetic or legacy user-role) must never clear the abort mark —
    // that self-clear was the "stop once, it revives" amplifier.
    clearOnUserMessage(sid, text) {
      if (!sid) return;
      if (typeof text === 'string' && text.trimStart().startsWith(GUARD_PREFIX)) return;
      aborted.delete(sid);
      exhaustedNotified.delete(sid);
    },

    markAborted(sid) {
      if (sid) aborted.add(sid);
    },

    recordAssistant(sid, record) {
      if (!sid || !record) return;
      lastAssistant.set(sid, record);
      pruneMap(lastAssistant);
    },

    async onError(sid, errObj) {
      if (!sid || aborted.has(sid)) return;
      const name = String(errObj?.name ?? '');
      // User pressed Esc/abort: MessageAbortedError (1.x) — never auto-resume.
      if (name === 'MessageAbortedError' || /abort/i.test(name)) {
        aborted.add(sid);
        return;
      }
      const text = errorText(errObj);
      if (!isRetryableError(errObj, text)) return;
      const dedupeKey = `${sid}:${text.slice(0, 80)}`;
      const now = Date.now();
      if (now - (errorDedupe.get(dedupeKey) ?? 0) < ERROR_DEDUPE_MS) return;
      errorDedupe.set(dedupeKey, now);
      pruneMap(errorDedupe);
      if (!(await io.isRoot(sid))) return;

      const count = errRetries.get(sid) ?? 0;
      if (count >= MAX_ERROR_RETRIES) {
        await notifyExhausted(sid, 'error retries');
        return;
      }
      errRetries.set(sid, count + 1);
      pruneMap(errRetries);

      // Backoff — rate limit / overload needs breathing room.
      await sleep(ERROR_BACKOFF_MS);
      // THE race fix: the user may have stopped the session during the sleep.
      if (aborted.has(sid)) return;

      await io.inject(
        sid,
        `${GUARD_PREFIX} Сессия прервана временной ошибкой провайдера: «${text.slice(0, 160).replace(/\n/g, ' ')}». ` +
        `Продолжи route с последнего незавершённого шага — не начинай заново и не дублируй уже вернувшие результат task()-вызовы. ` +
        `Если ошибка повторяется — сообщи пользователю и остановись.`,
      );
    },

    async onToolPartError(sid, { tool, partId, errorText: text, interrupted }) {
      if (!sid) return;
      // User-aborted tool call: respect it — mark and never retry.
      if (interrupted) {
        aborted.add(sid);
        return;
      }
      if (tool !== 'task' || !partId || !text) return;
      if (FATAL_RE.test(text) || !RETRYABLE_RE.test(text)) return;
      if (taskRetried.has(partId)) return;
      if ((sessionTaskRetries.get(sid) ?? 0) >= MAX_TASK_RETRIES_PER_SESSION) return;
      taskRetried.add(partId);
      pruneSet(taskRetried);
      sessionTaskRetries.set(sid, (sessionTaskRetries.get(sid) ?? 0) + 1);
      pruneMap(sessionTaskRetries);

      await sleep(TASK_BACKOFF_MS);
      if (aborted.has(sid)) return;
      await io.inject(
        sid,
        `${GUARD_PREFIX} Делегирование task() оборвалось временной ошибкой провайдера: «${text.slice(0, 160).replace(/\n/g, ' ')}». ` +
        `Повтори task() для того же агента и той же задачи один раз — не начинай заново: субагент мог частично выполнить работу. ` +
        `Если повтор упадёт — сообщи пользователю и остановись.`,
      );
    },

    /**
     * Drain boundary (idle / execution.succeeded). `last` is the last completed
     * assistant record { id, text, hasTool }; `hasIncompleteTodos` is legacy-only
     * (2.x facade has no todo API — delegation narration is the native signal).
     */
    async onDrain(sid, last, hasIncompleteTodos = false) {
      if (!sid || aborted.has(sid)) return;
      if (!(await io.isRoot(sid))) return;
      if (!last) return;

      if (last.hasTool) {
        // Session healthy again — reset budgets for the next episode.
        resetEpisode(sid);
        errRetries.delete(sid);
        return;
      }
      const text = String(last.text ?? '');
      if (!text.trim()) return;
      if (TERMINAL_RE.test(text)) {
        resetEpisode(sid);
        return;
      }

      const hasDelegationSignal = DELEGATION_RE.test(text);
      if (!hasDelegationSignal && !hasIncompleteTodos) return;

      const st = getNudgeState(sid);
      if (st.lastMsgId === last.id) return;
      if (st.count >= MAX_NUDGES) {
        await notifyExhausted(sid, 'nudges');
        return;
      }
      st.count += 1;
      st.lastMsgId = last.id;
      pruneMap(nudges);

      await io.inject(sid, nudgeText(text, hasDelegationSignal));
    },
  };
}

async function HaltGuard({ client } = {}) {
  const shared = sharedState();
  const io = {
    inject: async (sid, text) => {
      try {
        await client.session.prompt({ path: { id: sid }, body: { parts: [{ type: 'text', text }] } });
      } catch {
        // bounded — count attempt even on failure
      }
    },
    isRoot: async (sid) => {
      try {
        const res = await client.session.get({ path: { id: sid } });
        const sess = res?.data ?? res;
        return !sess?.parentID;
      } catch {
        return true; // get failed — don't block guard
      }
    },
    fetchLast: async (sid) => {
      let res;
      try {
        res = await client.session.messages({ path: { id: sid }, query: { limit: 8 } });
      } catch {
        return null;
      }
      const data = res?.data ?? res;
      const list = Array.isArray(data) ? data : data?.data ?? [];
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const entry = list[i];
        const info = entry?.info ?? entry;
        if (info?.role === 'assistant' && info?.time?.completed) {
          const parts = entry.parts ?? [];
          return {
            id: info.id ?? null,
            text: textOfParts(parts),
            hasTool: parts.some((p) => p?.type === 'tool'),
          };
        }
      }
      return null;
    },
    fetchIncompleteTodos: async (sid) => {
      try {
        const tRes = await client.session.todo({ path: { id: sid } });
        const todos = tRes?.data ?? tRes;
        const list = Array.isArray(todos) ? todos : todos?.data ?? [];
        return list.some((t) => t.status === 'pending' || t.status === 'in_progress');
      } catch {
        return false;
      }
    },
  };
  const policy = createPolicy(io, shared);

  return {
    event: async ({ event }) => {
      try {
        const type = event?.type;
        const props = event?.properties ?? {};
        const sid = props.sessionID ?? props.sessionId ?? null;

        if (type === 'session.deleted') {
          policy.cleanup(sid);
          return;
        }

        if (type === 'message.updated') {
          const info = props.info;
          if (info?.role === 'user' && info.sessionID) {
            policy.clearOnUserMessage(info.sessionID, textOfParts(props.parts));
            return;
          }
          if (info?.role === 'assistant' && info?.time?.completed) {
            policy.recordAssistant(info.sessionID ?? sid, {
              id: info.id ?? null,
              text: textOfParts(props.parts),
              hasTool: (props.parts ?? []).some((p) => p?.type === 'tool'),
            });
          }
          return;
        }

        if (type === 'session.error') {
          await policy.onError(sid, props.error);
          return;
        }

        if (type === 'message.part.updated') {
          const part = props.part;
          if (part?.type === 'tool' && part.state?.status === 'error') {
            await policy.onToolPartError(part.sessionID ?? sid, {
              tool: part.tool,
              partId: part.id ?? null,
              errorText: partErrorText(part),
              interrupted: part.state?.metadata?.interrupted === true
                || /tool execution aborted|user aborted/i.test(String(part.state?.error ?? '')),
            });
          }
          return;
        }

        if (type === 'session.idle') {
          const last = await io.fetchLast(sid);
          let hasIncompleteTodos = false;
          if (last && !last.hasTool && last.text.trim() && !TERMINAL_RE.test(last.text) && !DELEGATION_RE.test(last.text)) {
            hasIncompleteTodos = await io.fetchIncompleteTodos(sid);
          }
          await policy.onDrain(sid, last, hasIncompleteTodos);
        }
      } catch {
        // NEVER break session
      }
    },
  };
}

function disposerFor(registration) {
  if (typeof registration === 'function') return registration;
  if (typeof registration?.dispose === 'function') return () => registration.dispose();
  return async () => {};
}

function nativeEvent(raw) {
  let event = raw?.event ?? raw;
  if (!event?.type && event?.data?.type) event = event.data;
  const details = event?.properties ?? event?.data ?? {};
  return { type: event?.type, details };
}

async function handleNativeEvent(policy, raw) {
  const { type, details } = nativeEvent(raw);
  if (!type) return;
  const sid = details?.sessionID ?? details?.info?.sessionID ?? null;

  switch (type) {
    case 'session.deleted':
      policy.cleanup(sid);
      return;

    // THE native user-stop signal. Every reason means "do not revive":
    // user = Esc, shutdown/superseded = harness took over, inactivity = parked.
    case 'session.execution.interrupted':
      policy.markAborted(sid);
      return;

    case 'session.error':
    case 'session.execution.failed':
      await policy.onError(sid, details?.error ?? (details?.message ? { message: String(details.message) } : null));
      return;

    case 'message.part.updated': {
      const part = details?.part;
      if (part?.type !== 'tool' || part.state?.status !== 'error') return;
      await policy.onToolPartError(part.sessionID ?? sid, {
        tool: part.tool,
        partId: part.id ?? null,
        errorText: partErrorText(part),
        interrupted: part.state?.metadata?.interrupted === true
          || /tool execution aborted|user aborted/i.test(String(part.state?.error ?? '')),
      });
      return;
    }

    case 'session.step.failed':
      await policy.onToolPartError(sid, {
        tool: details?.tool ?? details?.name,
        partId: details?.partID ?? details?.id ?? null,
        errorText: errorText(details?.error ?? details),
        interrupted: details?.reason === 'user' || details?.metadata?.interrupted === true,
      });
      return;

    case 'message.updated': {
      const info = details?.info;
      if (info?.role === 'user') {
        policy.clearOnUserMessage(info.sessionID ?? sid, textOfParts(details?.parts));
        return;
      }
      if (info?.role === 'assistant' && info?.time?.completed) {
        policy.recordAssistant(info.sessionID ?? sid, {
          id: info.id ?? null,
          text: textOfParts(details?.parts),
          hasTool: (details?.parts ?? []).some((p) => p?.type === 'tool'),
        });
      }
      return;
    }

    // Drain boundaries: canonical 2.x first, deprecated 1.x-name fallback.
    case 'session.execution.succeeded':
    case 'session.idle':
      await policy.onDrain(sid, policy.shared.lastAssistant.get(sid) ?? null);
      return;

    default:
      return;
  }
}

/** OpenCode 2.x native registration. Always resolves to a dispose function. */
async function setup(ctx) {
  const shared = sharedState();
  const disposers = [];
  const owner = Symbol('halt-guard-owner');
  shared.owners.add(owner);

  const session = ctx?.session;
  const canInject = typeof session?.synthetic === 'function' || typeof session?.prompt === 'function';
  const io = {
    inject: async (sid, text) => {
      try {
        // Synthetic input is NOT a user message: it cannot trip the
        // "user is back" clear that amplified the historical revive bug.
        if (typeof session?.synthetic === 'function') {
          return await session.synthetic({ sessionID: sid, text, metadata: { source: GUARD_SOURCE } });
        }
        return await session.prompt({ sessionID: sid, text, metadata: { source: GUARD_SOURCE } });
      } catch {
        // bounded — count attempt even on failure
      }
    },
    isRoot: async (sid) => {
      if (typeof session?.get !== 'function') return true;
      try {
        const record = await session.get({ sessionID: sid });
        const sess = record?.data ?? record;
        return !sess?.parentID;
      } catch {
        return true;
      }
    },
  };
  const policy = createPolicy(io, shared);

  // A real user prompt re-arms the guard; guard-authored input does not.
  if (typeof session?.hook === 'function') {
    try {
      const reg = await session.hook('prompt', (event) => {
        try {
          if (event?.metadata?.source === GUARD_SOURCE) return;
          policy.clearOnUserMessage(event?.sessionID, typeof event?.prompt?.text === 'string' ? event.prompt.text : '');
        } catch {
          // NEVER break prompt admission
        }
      });
      disposers.push(disposerFor(reg));
    } catch {
      // Missing hook API must not disable the event-loop guard.
    }
  }

  // One process-shared consumer for duplicate global/project plugin copies.
  if (canInject && typeof ctx?.event?.subscribe === 'function' && !globalThis[EVENT_LOOP_KEY]) {
    const controller = new AbortController();
    const loop = (async () => {
      const subscription = await ctx.event.subscribe({ signal: controller.signal });
      // Generated 2.0.19 SDK resolves SSE to { stream }; some facades yield the
      // AsyncIterable directly. Accept both.
      const events = subscription?.stream ?? subscription;
      if (!events || typeof events[Symbol.asyncIterator] !== 'function') return;
      for await (const raw of events) {
        try {
          await handleNativeEvent(policy, raw);
        } catch {
          // Keep consuming so a later drain can still nudge.
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
    shared.owners.delete(owner);
    if (shared.owners.size === 0) {
      const eventLoop = globalThis[EVENT_LOOP_KEY];
      if (eventLoop) {
        eventLoop.controller.abort();
        delete globalThis[EVENT_LOOP_KEY];
      }
    }
  };
}

export { HaltGuard, createPolicy, sharedState, handleNativeEvent };
// opencode 2.x plugin format: the default export must be an object with an id
// and a server() factory - a bare function is rejected on load
// (PluginModule.LoadError). setup() is the live 2.x path: native events
// (session.execution.interrupted reason:"user" = absolute silence), synthetic
// injections, drain-boundary nudges; server() keeps the 1.x harness served.
export default { id: "halt-guard", server: HaltGuard, setup };
