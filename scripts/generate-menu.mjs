import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const commandDir = path.join(root, 'command');
const menuPath = path.join(commandDir, 'menu.md');

// Build menu.md content from command frontmatter. Pure function: used by the
// CLI below and by validate-registry.mjs for drift detection.
export function buildMenu() {
  // Walk the whole command/ tree: commands may live in subfolders
  // (e.g. command/prompt-engineering/prompt-optimizer.md) and must still be listed.
  const files = [];
  const stack = [commandDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'menu.md') {
        files.push(path.relative(commandDir, abs).split(path.sep).join('/'));
      }
    }
  }
  files.sort((a, b) => a.localeCompare(b));

  const entries = files.map((f) => {
    const text = fs.readFileSync(path.join(commandDir, f), 'utf8');
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const descMatch = fm ? fm[1].match(/^description:\s*(.+)$/m) : null;
    const name = f.replace(/\.md$/, '');
    const rawDesc = descMatch ? descMatch[1].trim() : '';
    // Strip wrapping YAML quotes so every entry renders consistently.
    const description = rawDesc.replace(/^(["'])(.*)\1$/, '$2') || '(нет описания)';
    return { name, description };
  });

  const commandList = entries.map((e) => `- \`/${e.name}\` — ${e.description}`).join('\n');

  return `---
description: Стартовая карта системы — как запросы маршрутизируются к агентам и какие slash-команды доступны
---

# Menu Command | Команда /menu

> Этот файл сгенерирован автоматически (\`npm run menu:gen\`). Ручные правки будут перезаписаны; валидатор реестра проверяет свежесть.

## Назначение
Показать карту возможностей системы. Режимы переключать не нужно: \`openagent\` — единственный primary-оркестратор, он сам классифицирует запрос и молча делегирует профильному субагенту.

## Поведение
1) Выведи карту (формат ниже) и спроси задачу.
2) Классифицируй ответ пользователя как обычный запрос и маршрутизируй по \`functional_modes\` / \`delegation_rules\`.
3) \`/menu\` можно вызвать повторно.

## Формат ответа
\`\`\`
## Карта системы

Просто опишите задачу — оркестратор сам выберет маршрут:
- Новая фича / код -> coder
- Баг / падение -> debugger
- Тесты -> tester
- Ревью / аудит / безопасность -> contextscout + reviewer
- План / декомпозиция -> planner
- Архитектура / ADR / C4 -> architect
- Docker / CI/CD / деплой -> devops
- Документация -> docwriter
- Визуальные UI тесты -> uitester

Slash-команды (${entries.length}):
${commandList}

Полный запуск цепочки без остановок: добавьте \`one-shot: on\` или \`сделай под ключ\`.
\`\`\`
`;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const content = buildMenu();
  fs.writeFileSync(menuPath, content, 'utf8');
  console.log(`OK: command/menu.md regenerated (${content.length} bytes).`);
}
