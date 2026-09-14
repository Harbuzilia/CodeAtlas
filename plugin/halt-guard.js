// OpenCode Halt-Guard Plugin — runtime auto-continue for narrated delegation stalls
// and transient provider errors.
// Problem 1: weak models (Gemini Flash, Kimi, Qwen, DeepSeek) often write
//   "передаю агенту ..." as TEXT instead of calling task() tool.
//   Turn ends with no tool call, session goes idle, work stops.
// Problem 2: provider throws a transient error (429/5xx/overloaded/network)
//   mid-route — session dies silently, no recovery.
// This plugin watches session.idle and session.error, injecting a synthetic
// continuation. Design: NEVER throw, bounded (3 nudges + 2 error retries per
// session), root sessions only (parentID guard), prompt-only guard fallback.

const TERMINAL_RE = /(Работа завершена|FAILED)\.?\s*Возвращаю управление\./;
const DELEGATION_RE = /(передаю|делегирую|делегац|передал|вызываю\s*task|task\s*\(|handoff|delegat|next\s+agent|следующ.*агент|продолж.*цепочк)/i;
// Transient provider failures — worth one bounded auto-resume.
const RETRYABLE_RE = /(rate.?limit|429|overload|too many|\b5\d\d\b|timeout|timed? ?out|ECONNRESET|ETIMEDOUT|ECONNREFUSED|fetch failed|network|socket|stream|aborted)/i;
// Fatal — never auto-resume (auth, billing, hard quota). User must act.
const FATAL_RE = /(401|403|unauthorized|forbidden|invalid.{0,12}api.?key|incorrect.{0,12}api.?key|insufficient.?quota|billing|payment|permission denied)/i;

const MAX_NUDGES = 3;
const MAX_ERROR_RETRIES = 2;
const ERROR_BACKOFF_MS = 5000;
const MAX_MAP_SIZE = 200;

export default async function HaltGuard({ client }) {
  // opencode loads this plugin twice when it exists in BOTH the global config
  // (~/.config/opencode/plugin) and the project (.opencode/plugin). Keep the
  // per-session budgets in one process-wide registry, otherwise each copy counts
  // independently and a session gets nudged/retried up to 2x the intended limit.
  const STATE_KEY = Symbol.for('opencode.halt-guard.state');
  const shared = (globalThis[STATE_KEY] ??= { nudges: new Map(), errRetries: new Map() });
  const nudges = shared.nudges; // sessionID -> { count, lastMsgId }
  const errRetries = shared.errRetries; // sessionID -> count

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

        // --- Provider error auto-resume (bounded) ---
        if (event?.type === 'session.error') {
          const sessionID = getSessionId(event);
          if (!sessionID) return;
          const errText = extractErrorText(event);
          if (!errText || FATAL_RE.test(errText) || !RETRYABLE_RE.test(errText)) return;
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

        if (event?.type !== 'session.idle') return;
        const sessionID = event.properties?.sessionID;
        if (!sessionID) return;
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
