// OpenCode Bash-Guard Plugin — blocks foreground long-running processes in the
// shell tool BEFORE they hang the session.
//
// Why: a dev server / watcher started in the foreground never exits; the shell
// tool's timeout kills the child but the stdio pipe stays open, so the call
// blocks indefinitely (upstream opencode #49169; the same pipe-EOF trap hits
// daemon CLIs like agent-browser under PowerShell). The user then has to abort
// by hand — losing the turn.
//
// Design: tool.execute.before throws for foreground server/daemon patterns
// without a detach marker; the thrown text reaches the model as the tool
// error, teaching it the detached + healthcheck pattern. NEVER touches bounded
// commands (tests, builds, git).

// Foreground servers / watchers that never exit on their own.
const FOREGROUND_SERVER_RE =
  /(?:^|[\s;&|()])(?:pnpm|npm|yarn|bun)\s+(?:run\s+)?(?:dev|start|serve|watch)\b|(?:^|[\s;&|()])tsx\s+watch\b|(?:^|[\s;&|()])(?:vite|next|nuxt|astro)\s+dev\b|(?:^|[\s;&|()])nodemon\b|(?:^|[\s;&|()])http-server\b|(?:^|[\s;&|()])dotnet\s+watch\b|(?:^|[\s;&|()])uvicorn\b|(?:^|[\s;&|()])python\s+-m\s+http\.server\b|(?:^|[\s;&|()])live-server\b/i;

// Markers that make the launch safe (detached / bounded / logged).
const DETACH_RE = /Start-Process|start\s+\/b|nohup|setsid|&\s*$|>\s*\S+\s*2>&1\s*&|\btimeout\s+(\/t\s+)?\d/i;

// Piping a non-terminating stream into a consumer that waits for EOF hangs
// PowerShell forever (the agent-browser/`pnpm dev | Select-Object` incident).
const PIPE_HANG_RE = /\|\s*(Select-Object|Select-String|head|more|less|findstr)\b/i;

const GUIDANCE =
  '[BASH-GUARD] Заблокировано: foreground dev-сервер/вотчер повиснет до timeout/abort ' +
  '(upstream opencode #49169: пайп stdio держит вызов открытым). Запускай детачённо с логом: ' +
  'PowerShell — Start-Process pwsh -ArgumentList \'<cmd>\' -WindowStyle Hidden с редиректом в файл лога; ' +
  'Git Bash — nohup <cmd> > server.log 2>&1 &. Готовность проверяй healthcheck с таймаутом ' +
  '(Invoke-WebRequest -Uri <url> -TimeoutSec 5 / curl -m 5 <url>), логи читай из файла порциями. ' +
  'Не пайпь вотчеры/демоны в Select-Object/head (ожидание EOF = вечное висение). ' +
  'Для разовых длинных команд передай timeout в bash-tool. Подробности — instructions.md, блок LONG-RUNNING.';

export default async function BashGuard() {
  return {
    'tool.execute.before': async (input, output) => {
      try {
        const tool = input?.tool;
        if (tool !== 'bash' && tool !== 'shell') return;
        const cmd = String(output?.args?.command ?? output?.args?.cmd ?? '');
        if (!cmd) return;
        const serverish = FOREGROUND_SERVER_RE.test(cmd);
        const piped = PIPE_HANG_RE.test(cmd);
        if ((serverish && !DETACH_RE.test(cmd)) || (serverish && piped)) {
          throw new Error(GUIDANCE);
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('[BASH-GUARD]')) throw e;
        // NEVER break the session on our own bugs
      }
    },
  };
}
