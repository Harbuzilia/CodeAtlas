// OpenCode Bash-Guard Plugin — blocks foreground long-running processes in the
// shell tool BEFORE they hang the session.
//
// Why: a dev server / watcher started in the foreground never exits; the shell
// tool's timeout kills the child but the stdio pipe stays open, so the call
// blocks indefinitely (upstream opencode #49169; the same pipe-EOF trap hits
// any daemon CLI under PowerShell). The user then has to abort
// by hand — losing the turn.
//
// Design: tool.execute.before throws for foreground server/daemon patterns
// without a detach marker; the thrown text reaches the model as the tool
// error, teaching it the detached + healthcheck pattern. NEVER touches bounded
// commands (tests, builds, git).
//
// Dual API: opencode 1.x calls the legacy `server` factory; opencode 2.x calls
// `setup(ctx)` with the native tool-hook API (ctx.tool.hook('execute.before')
// — payload { tool, sessionID, agent, input } where the shell tool is named
// "shell"). The check logic is shared.

// Foreground servers / watchers that never exit on their own.
const FOREGROUND_SERVER_RE =
  /(?:^|[\s;&|()])(?:pnpm|npm|yarn|bun)\s+(?:run\s+)?(?:dev|start|serve|watch)\b|(?:^|[\s;&|()])tsx\s+watch\b|(?:^|[\s;&|()])(?:vite|next|nuxt|astro)\s+dev\b|(?:^|[\s;&|()])nodemon\b|(?:^|[\s;&|()])http-server\b|(?:^|[\s;&|()])(?:dotnet\s+watch|dotnet\s+run)\b|(?:^|[\s;&|()])ng\s+serve\b|(?:^|[\s;&|()])(?:flask\s+run|python\s+-m\s+flask\s+run)\b|(?:^|[\s;&|()])gunicorn\b|(?:^|[\s;&|()])(?:python3?|py)\s+manage\.py\s+runserver\b|(?:^|[\s;&|()])(?:tsc|jest|vitest)\b[^;&|]*--watch\b|(?:^|[\s;&|()])uvicorn\b|(?:^|[\s;&|()])python\s+-m\s+http\.server\b|(?:^|[\s;&|()])live-server\b/i;

// Markers that make the launch safe (detached / bounded / logged).
const DETACH_RE = /Start-Process|start\s+\/b|nohup|setsid|&\s*$|>\s*\S+\s*2>&1\s*&|\btimeout\s+(\/t\s+)?\d/i;

// Piping a non-terminating stream into a consumer that waits for EOF hangs
// PowerShell forever (the `pnpm dev | Select-Object` incident).
const PIPE_HANG_RE = /\|\s*(Select-Object|Select-String|head|more|less|findstr)\b/i;

const GUIDANCE =
  '[BASH-GUARD] Заблокировано: foreground dev-сервер/вотчер повиснет до timeout/abort ' +
  '(upstream opencode #49169: пайп stdio держит вызов открытым). Запускай детачённо с логом: ' +
  'PowerShell — Start-Process pwsh -ArgumentList \'<cmd>\' -WindowStyle Hidden с редиректом в файл лога; ' +
  'Git Bash — nohup <cmd> > server.log 2>&1 &. Готовность проверяй healthcheck с таймаутом ' +
  '(Invoke-WebRequest -Uri <url> -TimeoutSec 5 / curl -m 5 <url>), логи читай из файла порциями. ' +
  'Не пайпь вотчеры/демоны в Select-Object/head (ожидание EOF = вечное висение). ' +
  'Для разовых длинных команд передай timeout в bash-tool. Подробности — instructions.md, блок LONG-RUNNING.';

/** Shared check: returns the guidance text to throw, or null when allowed. */
export function shellBlockReason(cmd) {
  const command = String(cmd ?? '');
  if (!command) return null;
  const serverish = FOREGROUND_SERVER_RE.test(command);
  const piped = PIPE_HANG_RE.test(command);
  if ((serverish && !DETACH_RE.test(command)) || (serverish && piped)) return GUIDANCE;
  return null;
}

const SHELL_TOOLS = new Set(['bash', 'shell']);

async function BashGuard() {
  return {
    'tool.execute.before': async (input, output) => {
      try {
        if (!SHELL_TOOLS.has(input?.tool)) return;
        const cmd = output?.args?.command ?? output?.args?.cmd ?? '';
        const reason = shellBlockReason(cmd);
        if (reason) throw new Error(reason);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('[BASH-GUARD]')) throw e;
        // NEVER break the session on our own bugs
      }
    },
  };
}

/** opencode 2.x native registration. Always resolves to a dispose function. */
async function setup(ctx) {
  try {
    if (typeof ctx?.tool?.hook !== 'function') return async () => {};
    const reg = await ctx.tool.hook('execute.before', async (payload) => {
      try {
        if (!SHELL_TOOLS.has(String(payload?.tool ?? ''))) return;
        const cmd = payload?.input?.command ?? payload?.input?.cmd ?? '';
        const reason = shellBlockReason(cmd);
        if (reason) throw new Error(reason);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('[BASH-GUARD]')) throw e;
      }
    });
    return async () => {
      try {
        await reg?.dispose?.();
      } catch {}
    };
  } catch {
    return async () => {};
  }
}

export { BashGuard };
export default { id: 'bash-guard', server: BashGuard, setup };