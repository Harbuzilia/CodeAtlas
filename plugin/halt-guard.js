// OpenCode Halt-Guard Plugin — runtime auto-continue for narrated delegation stalls
// and transient provider errors.
// Problem 1: weak models (Gemini Flash, Kimi, Qwen, DeepSeek) often write
//   "передаю агенту ..." as TEXT instead of calling task() tool.
//   Turn ends with no tool call, session goes idle, work stops.
// Problem 2: provider throws a transient error (429/5xx/overloaded/network)
//   mid-route — session dies silently, no recovery.
// Problem 3: a task() delegation dies on a transient provider error — the whole
//   subagent run is lost and the chain stalls (subagent sessions are not
//   guarded directly, so we nudge the ROOT session to re-issue the task once).
// Problem 4: a USER abort (Esc) used to look like a transient error ("aborted")
//   and got auto-resumed against the user's wish. Now MessageAbortedError and
//   interrupted tool parts mark the session; no resume/nudge until the user
//   writes again.
// This plugin watches session.idle, session.error and message.part.updated,
// injecting a synthetic continuation. Design: NEVER throw, bounded (3 nudges +
// 2 error retries per session + 1 retry per failed task part, 2 task retries
// per session), root sessions only (parentID guard), prompt-only guard fallback.

const TERMINAL_RE = /(Работа завершена|FAILED)\.?\s*Возвращаю управление\./;
const DELEGATION_RE = /(передаю|делегирую|делегац|передал|вызываю\s*task|task\s*\(|handoff|delegat|next\s+agent|следующ.*агент|продолж.*цепочк)/i;
// Transient provider failures — worth one bounded auto-resume.
// NOTE: "aborted" is deliberately NOT here: a user abort surfaces with the same
// wording but must never be auto-resumed (see MessageAbortedError handling).
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

export default async function HaltGuard({ client }) {
  // opencode loads this plugin twice when it exists in BOTH the global config
  // (~/.config/opencode/plugin) and the project (.opencode/plugin). Keep the
  // per-session budgets in one process-wide registry, otherwise each copy counts
  // independently and a session gets nudged/retried up to 2x the intended limit.
  const STATE_KEY = Symbol.for('opencode.halt-guard.state');
  const shared = (globalThis[STATE_KEY] ??= {
    nudges: new Map(),
    errRetries: new Map(),
    taskRetried: new Set(), // part ids already nudged
    sessionTaskRetries: new Map(), // sessionID -> count
    aborted: new Set(), // sessions the USER aborted — never auto-resume these
  });
  const nudges = shared.nudges; // sessionID -> { count, lastMsgId }
  const errRetries = shared.errRetries; // sessionID -> count
  const taskRetried = shared.taskRetried;
  const sessionTaskRetries = shared.sessionTaskRetries;
  const aborted = shared.aborted;

  const getNudgeState = (sid) => {
    if (!nudges.has(sid)) nudges.set(sid, { count: 0, lastMsgId: null });
    return nudges.get(sid);
  };

  const pruneMap = (map) => {
    if (map.size > MAX_MAP_SIZE) {
      const toDelete = map.size - MAX_MAP_SIZE;
      let i = 0;
      for (const k of map.keys()) { if (i++ >= toDelete) break; map.delete(k); }
    }
  };

  const getSessionId = (event) =>
    event?.properties?.sessionID ?? event?.properties?.sessionId ?? null;

  // Only guard root sessions — nudging a subagent wastes its step budget.
  const isRootSession = async (sid) => {
    try {
      const res = await client.session.get({ path: { id: sid } });
      const sess = res?.data ?? res;
      return !sess?.parentID;
    } catch {
      return true; // get failed — don't block guard
    }
  };

  const extractErrorText = (event) => {
    const err = event?.properties?.error;
    if (!err) return '';
    if (typeof err === 'string') return err;
    return [err.statusCode, err.name, err.message].filter(Boolean).join(' ');
  };

  return {
    event: async ({ event }) => {
      try {
        // Cleanup on session delete — prevent leak
        if (event?.type === 'session.deleted') {
          const sid = getSessionId(event);
          if (sid) { nudges.delete(sid); errRetries.delete(sid); }
          return;
        }

        // A new user message means the user is back in control — clear the
        // abort mark so later genuine stalls can be nudged again.
        if (event?.type === 'message.updated') {
          const info = event?.properties?.info;
          if (info?.role === 'user' && info.sessionID) aborted.delete(info.sessionID);
          return;
        }

        // --- Provider error auto-resume (bounded) ---
        if (event?.type === 'session.error') {
          const sessionID = getSessionId(event);
          if (!sessionID) return;
          const errObj = event?.properties?.error;
          // User pressed Esc/abort: MessageAbortedError. NEVER auto-resume —
          // remember the mark so the following session.idle also stays silent.
          if (errObj?.name === 'MessageAbortedError' || /abort/i.test(String(errObj?.name ?? ''))) {
            aborted.add(sessionID);
            return;
          }
          const errText = extractErrorText(event);
          if (!errText || FATAL_RE.test(errText)) return;
          // Prefer structured retryability from the API error; fall back to text.
          const retryable =
            errObj?.name === 'APIError'
              ? errObj?.data?.isRetryable === true || RETRYABLE_RE.test(errText)
              : RETRYABLE_RE.test(errText);
          if (!retryable) return;
          if (!(await isRootSession(sessionID))) return;

          const count = errRetries.get(sessionID) ?? 0;
          if (count >= MAX_ERROR_RETRIES) return;
          errRetries.set(sessionID, count + 1);
          pruneMap(errRetries);

          // Backoff — rate limit / overload needs breathing room
          await new Promise((r) => setTimeout(r, ERROR_BACKOFF_MS));

          const text =
            `[HALT-GUARD] Сессия прервана временной ошибкой провайдера: «${errText.slice(0, 160).replace(/\n/g, ' ')}». ` +
            `Продолжи route с последнего незавершённого шага — не начинай заново и не дублируй уже вернувшие результат task()-вызовы. ` +
            `Если ошибка повторяется — сообщи пользователю и остановись.`;
          try {
            await client.session.prompt({
              path: { id: sessionID },
              body: { parts: [{ type: 'text', text }] },
            });
          } catch {
            // bounded — count attempt even on failure
          }
          return;
        }

        // --- Failed delegation retry (subagent killed by transient error) ---
        // The task tool runs in the ROOT session, so part.sessionID is the
        // orchestrator — no parentID check needed (subagents have task denied).
        if (event?.type === 'message.part.updated') {
          const part = event?.properties?.part;
          if (part?.type === 'tool' && part.state?.status === 'error') {
            const sid = part.sessionID ?? null;
            // User-aborted tool call ("Tool execution aborted", interrupted
            // metadata): respect it — mark the session and never retry.
            if (part.state?.metadata?.interrupted === true || /tool execution aborted|user aborted/i.test(String(part.state?.error ?? ''))) {
              if (sid) aborted.add(sid);
              return;
            }
          }
          if (part?.type === 'tool' && part.tool === 'task' && part.state?.status === 'error') {
            const sid = part.sessionID ?? null;
            const partId = part.id ?? null;
            const errObj = part.state?.error;
            const errText =
              typeof errObj === 'string'
                ? errObj
                : [errObj?.name, errObj?.message, part.state?.output].filter(Boolean).join(' ').slice(0, 300);
            if (
              sid &&
              partId &&
              errText &&
              !FATAL_RE.test(errText) &&
              RETRYABLE_RE.test(errText) &&
              !taskRetried.has(partId) &&
              (sessionTaskRetries.get(sid) ?? 0) < MAX_TASK_RETRIES_PER_SESSION
            ) {
              taskRetried.add(partId);
              sessionTaskRetries.set(sid, (sessionTaskRetries.get(sid) ?? 0) + 1);
              pruneMap(sessionTaskRetries);
              if (taskRetried.size > MAX_MAP_SIZE) {
                // keep the set bounded: drop the oldest entries
                const drop = taskRetried.size - MAX_MAP_SIZE;
                let i = 0;
                for (const k of taskRetried) {
                  if (i++ >= drop) break;
                  taskRetried.delete(k);
                }
              }
              await new Promise((r) => setTimeout(r, TASK_BACKOFF_MS));
              const text =
                `[HALT-GUARD] Делегирование task() оборвалось временной ошибкой провайдера: «${errText.slice(0, 160).replace(/\n/g, ' ')}». ` +
                `Повтори task() для того же агента и той же задачи один раз — не начинай заново: субагент мог частично выполнить работу. ` +
                `Если повтор упадёт — сообщи пользователю и остановись.`;
              try {
                await client.session.prompt({
                  path: { id: sid },
                  body: { parts: [{ type: 'text', text }] },
                });
              } catch {
                // bounded — count attempt even on failure
              }
            }
          }
          return;
        }

        if (event?.type !== 'session.idle') return;
        const sessionID = event.properties?.sessionID;
        if (!sessionID) return;
        // Idle right after a user abort: stay silent until the user writes again.
        if (aborted.has(sessionID)) return;
        if (!(await isRootSession(sessionID))) return;

        let res;
        try {
          res = await client.session.messages({ path: { id: sessionID }, query: { limit: 8 } });
        } catch {
          return;
        }
        const data = res?.data ?? res;
        const list = Array.isArray(data) ? data : data?.data ?? [];
        if (!list.length) return;

        let last = null;
        for (let i = list.length - 1; i >= 0; i--) {
          const entry = list[i];
          const info = entry?.info ?? entry;
          if (info?.role === 'assistant' && info?.time?.completed) {
            last = entry;
            break;
          }
        }
        if (!last) return;

        const info = last.info ?? last;
        const parts = last.parts ?? [];

        const hasTool = parts.some((p) => p?.type === 'tool');
        if (hasTool) {
          const st = getNudgeState(sessionID);
          st.count = 0;
          st.lastMsgId = null;
          errRetries.delete(sessionID); // session healthy again — reset error budget
          return;
        }

        const textParts = parts.filter((p) => p?.type === 'text').map((p) => p.text ?? '').join('\n');
        if (!textParts.trim()) return;
        if (TERMINAL_RE.test(textParts)) {
          const st = getNudgeState(sessionID);
          st.count = 0;
          st.lastMsgId = null;
          return;
        }

        // Halt signal = delegation narrated OR incomplete todos without terminal
        const hasDelegationSignal = DELEGATION_RE.test(textParts);
        let hasIncompleteTodos = false;
        if (!hasDelegationSignal) {
          try {
            const tRes = await client.session.todo({ path: { id: sessionID } });
            const todos = tRes?.data ?? tRes;
            const list2 = Array.isArray(todos) ? todos : todos?.data ?? [];
            hasIncompleteTodos = list2.some((t) => t.status === 'pending' || t.status === 'in_progress');
          } catch {
            // todo fetch failed — fall back to delegation-only signal
          }
          if (!hasIncompleteTodos) return;
        }

        const st = getNudgeState(sessionID);
        if (st.lastMsgId === info.id) return;
        if (st.count >= MAX_NUDGES) return;

        st.count += 1;
        st.lastMsgId = info.id;
        pruneMap(nudges);

        const nudgeText = hasDelegationSignal
          ? `[HALT-GUARD] Ты задекларировал делегацию текстом («${textParts.slice(0, 120).replace(/\n/g, ' ')}…») но не вызвал task() и сессия встала. ` +
            `Немедленно вызови task() для следующего агента в route как function call, без текста перед вызовом. ` +
            `ВАЖНО: не дублируй делегацию — если task() для этого шага уже вызывался ранее в этой сессии и вернул результат, переходи к следующему агенту route или к финальному отчёту, а не вызывай тот же task() повторно. ` +
            `Если вся цепочка завершена — заверши фразой «Работа завершена. Возвращаю управление.»`
          : `[HALT-GUARD] Сессия встала: есть незавершённые todos, но ты вывел только текст без task(). Продолжи route — вызови task() для следующего агента. Не дублируй уже сделанные делегации. Если всё готово — заверши фразой «Работа завершена. Возвращаю управление.»`;

        try {
          await client.session.prompt({
            path: { id: sessionID },
            body: { parts: [{ type: 'text', text: nudgeText }] },
          });
        } catch {
          // bounded — do not decrement, count attempt even on failure
        }
      } catch {
        // NEVER break session
      }
    },
  };
}
