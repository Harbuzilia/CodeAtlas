# Code Atlas — мультиагентная конфигурация для opencode

Переносимый вход в систему для ЛЮБОГО харнеса (opencode, Codex, Cursor и др.).
Полная карта и правила — `PROJECT_GUIDE.md`; стандарты кода/тестов/доков и workflow — `context/` (вход: `context/navigation.md`); стековые стандарты — `context/standards/`.

## Карта системы

- **Единственный вход**: оркестратор `openagent` классифицирует запрос и делегирует профильным субагентам (serial-цепочки; лёгкие правки — LIGHT-ROUTE одним кодером); лёгкие вопросы выполняет сам.
- **Агенты**: `agents/*.md` (frontmatter: mode, model, steps, permission) + системный промпт; регистрация в `opencode.json`.
- **Скиллы**: `skills/<name>/SKILL.md` по стандарту Agent Skills (agentskills.io) — загружаются on-demand; каталог инжектится харнесом автоматически.
- **Команды**: `command/**/*.md` (`/menu` — сгенерированная карта).
- **Модели на агентов**: пресеты `config/model-presets.json` (quality/balanced/cost/speed/inherit), применение `npm run models:apply -- <preset>`.

## Базовые правила

1. Отвечай на языке пользователя.
2. Делегируй профильные задачи профильным агентам; не делай сам работу субагента.
3. Один шаг = один смысловой коммит (Conventional Commits, без эмодзи).
4. Не заявляй «готово» без прогона проверки (скилл `verification-before-completion`).
5. Права инструментов — только через `permission:` в frontmatter агентов (без deprecated `tools:`).

## Харнесы

- **opencode**: `opencode.json` — source of truth; runtime-зеркало `.opencode/` генерируется `npm run sync:local`; гейты — `npm run validate:all`.
- **другие харнесы**: скиллы ставятся в `~/.agents/skills` (`npm run sync:all -- --with-agents-skills`); инструкции — этот файл + `context/`; детали переноса — `docs/PORTABILITY.md`.
