// OpenCode Secret-Guard Plugin — real enforcement where permission path globs
// cannot help.
//
// Why: path globs in `permission` (e.g. "**/*.env*": "deny") never match on
// opencode 1.18.x for edit/write (worktree-relative matching quirks), so the
// pack's .env protection was prompt-level only. opencode itself denies `.env`
// READS by default, but *.key/*.pem/id_rsa/* and bash exfiltration
// (cat/type/get-content) are not covered anywhere.
//
// This plugin blocks, at tool.execute.before:
//   - read/edit/write/patch/apply_patch on secret-looking paths (incl. non-dotfile *.env)
//   - bash commands that print secret-looking files (cat/type/get-content/grep/rg/sed/...)
// The thrown error reaches the model as the tool result, so the agent learns
// to use env vars / secret managers instead.
//
// Dual API: opencode 1.x calls the legacy `server` factory; opencode 2.x calls
// `setup(ctx)` with the native tool-hook API (ctx.tool.hook('execute.before')
// — payload { tool, sessionID, agent, input }; 2.x file tools carry the path
// under `input.path` and the shell tool is named "shell"). Checks are shared.

// .env.example/.env.sample/.env.template are committable templates, not secrets.
// The bash reader regex mirrors the same whitelist (a bare `cat .env.example`
// used to be blocked — a false positive the path regex never had).
const SECRET_PATH_RE =
  /(^|[/\\])([^/\\]*\.env(?!\.(example|sample|template))(?:\.[^/\\]*)?|[^/\\]+\.(key|pem|pfx|p12|keystore|jks)|id_rsa|id_ed25519|id_dsa|\.netrc|credentials\.json|secrets\.(json|ya?ml))$/i;

const BASH_SECRET_RE =
  /(^|[\s;&|()])(cat|type|more|less|head|tail|gc|get-content|select-string|findstr|bat|grep|rg|sed|awk)\b[^;&|]*?([/\\]|^|\s)([\w.-]*\.env(?!\.(example|sample|template))(\.|$)[^\s]*|[^/\s\\]+\.(key|pem|pfx|p12)|id_rsa|id_ed25519|\.netrc)/i;

const GUIDANCE =
  '[SECRET-GUARD] Доступ к файлу секретов заблокирован (.env*, *.key, *.pem, id_*, .netrc, credentials). ' +
  'Секреты читаются только процессами/окружением, не агентом: используй переменные окружения, ' +
  '.env.example как шаблон и секрет-менеджер в проде. Если значение нужно для диагностики — ' +
  'попроси пользователя предоставить его явно (question tool), не читая файл.';

const FILE_TOOLS = new Set(['read', 'edit', 'write', 'patch', 'apply_patch']);
const SHELL_TOOLS = new Set(['bash', 'shell']);

const isSecretPath = (p) => typeof p === 'string' && SECRET_PATH_RE.test(p.trim());

/** Shared checks: return the guidance text to throw, or null when allowed. */
export function secretPathBlock(pathLike) {
  return isSecretPath(pathLike) ? GUIDANCE : null;
}
export function bashSecretBlock(cmd) {
  return BASH_SECRET_RE.test(String(cmd ?? '')) ? GUIDANCE : null;
}

async function SecretGuard() {
  return {
    'tool.execute.before': async (input, output) => {
      try {
        const tool = input?.tool;
        const args = output?.args ?? {};
        if (FILE_TOOLS.has(tool)) {
          const reason = secretPathBlock(args.file_path ?? args.path ?? args.filePath);
          if (reason) throw new Error(reason);
          return;
        }
        if (SHELL_TOOLS.has(tool)) {
          const reason = bashSecretBlock(args.command ?? args.cmd ?? '');
          if (reason) throw new Error(reason);
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('[SECRET-GUARD]')) throw e;
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
        const tool = String(payload?.tool ?? '');
        const input = payload?.input ?? {};
        if (FILE_TOOLS.has(tool)) {
          const reason = secretPathBlock(input.path ?? input.file_path ?? input.filePath);
          if (reason) throw new Error(reason);
          return;
        }
        if (SHELL_TOOLS.has(tool)) {
          const reason = bashSecretBlock(input.command ?? input.cmd ?? '');
          if (reason) throw new Error(reason);
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('[SECRET-GUARD]')) throw e;
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

export { SecretGuard };
export default { id: 'secret-guard', server: SecretGuard, setup };