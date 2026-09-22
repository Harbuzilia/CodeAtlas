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
//   - read/edit/write/patch/apply_patch on secret-looking paths
//   - bash commands that print secret-looking files (cat/type/get-content/...)
// The thrown error reaches the model as the tool result, so the agent learns
// to use env vars / secret managers instead.

// .env.example/.env.sample/.env.template are committable templates, not secrets.
const SECRET_PATH_RE =
  /(^|[/\\])(\.env(?!\.(example|sample|template))(\.|$)[^/\\]*|[^/\\]+\.(key|pem|pfx|p12|keystore|jks)|id_rsa|id_ed25519|id_dsa|\.netrc|credentials\.json|secrets\.(json|ya?ml))$/i;

const BASH_SECRET_RE =
  /(^|[\s;&|()])(cat|type|more|less|head|tail|gc|get-content|select-string|findstr|bat)\b[^;&|]*?([/\\]|^|\s)(\.env(\.|$)[^\s]*|[^/\s\\]+\.(key|pem|pfx|p12)|id_rsa|id_ed25519|\.netrc)/i;

const GUIDANCE =
  '[SECRET-GUARD] Доступ к файлу секретов заблокирован (.env*, *.key, *.pem, id_*, .netrc, credentials). ' +
  'Секреты читаются только процессами/окружением, не агентом: используй переменные окружения, ' +
  '.env.example как шаблон и секрет-менеджер в проде. Если значение нужно для диагностики — ' +
  'попроси пользователя предоставить его явно (question tool), не читая файл.';

const isSecretPath = (p) => typeof p === 'string' && SECRET_PATH_RE.test(p.trim());

export default async function SecretGuard() {
  return {
    'tool.execute.before': async (input, output) => {
      try {
        const tool = input?.tool;
        const args = output?.args ?? {};
        if (tool === 'read' || tool === 'edit' || tool === 'write' || tool === 'patch' || tool === 'apply_patch') {
          if (isSecretPath(args.file_path ?? args.path ?? args.filePath)) throw new Error(GUIDANCE);
          return;
        }
        if (tool === 'bash' || tool === 'shell') {
          const cmd = String(args.command ?? args.cmd ?? '');
          if (BASH_SECRET_RE.test(cmd)) throw new Error(GUIDANCE);
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('[SECRET-GUARD]')) throw e;
        // NEVER break the session on our own bugs
      }
    },
  };
}
