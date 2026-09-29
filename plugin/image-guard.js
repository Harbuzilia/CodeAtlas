// OpenCode Image-Guard Plugin — stops text-only agents from "reading" images.
//
// Why: when a text-only model (GLM-5.3 et al.) executes `read` on a .png, the
// provider silently drops the image attachment and the model CONFABULATES a
// confident description from the filename and context (real incident: a light
// desktop screenshot "sb-chat-page.png" was described as "mobile, dark theme"
// — and the model prefaced it with "so you can be sure it's not a bluff").
// Wrong output dressed as a fact is worse than an honest error, so the read is
// blocked for anyone but image-capable agents: `vision` (screenshots) and
// `uitester` (its own UI shots — its model is image-capable in the pack).
//
// Dual API: opencode 1.x calls the legacy `server` factory; opencode 2.x calls
// `setup(ctx)` with the native tool-hook API (ctx.tool.hook('execute.before')
// — payload { tool, sessionID, agent, input }). The thrown error reaches the
// model as the tool result and carries the delegation recipe.

/** Agents whose models can actually see images. */
export const IMAGE_READERS = new Set(['vision', 'uitester']);

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|avif|tiff?)$/i;
const READ_TOOLS = new Set(['read', 'Read']);

const GUIDANCE =
  '[IMAGE-GUARD] Изображения текстовой моделью не читаются: провайдер молча отбрасывает картинку, ' +
  'и модель прифантазирует описание по имени файла (пойманный случай — выдуманный «мобильный тёмный чат» ' +
  'при светлом desktop-скрине). Делегируй чтение субагенту с image-моделью: ' +
  'task(vision, «прочитай изображение: <путь>; опиши текст и проблемы фактами»). ' +
  'Не описывай изображение сам — даже частично.';

/** Shared check: returns the guidance text to throw, or null when allowed. */
export function imageBlockReason({ tool, agent, filePath } = {}) {
  if (!READ_TOOLS.has(String(tool ?? ''))) return null;
  if (typeof filePath !== 'string' || !IMAGE_RE.test(filePath.trim())) return null;
  if (IMAGE_READERS.has(String(agent ?? ''))) return null;
  return GUIDANCE;
}

async function ImageGuard() {
  return {
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

/** opencode 2.x native registration. Always resolves to a dispose function. */
async function setup(ctx) {
  try {
    if (typeof ctx?.tool?.hook !== 'function') return async () => {};
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
    return async () => {
      try {
        await reg?.dispose?.();
      } catch {}
    };
  } catch {
    return async () => {};
  }
}

export { ImageGuard };
export default { id: 'image-guard', server: ImageGuard, setup };