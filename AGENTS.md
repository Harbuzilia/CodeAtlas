# Code Atlas — мультиагентная конфигурация для opencode

Этот репозиторий — конфиг-набор (пресет) для CLI-агентов: 12 агентов, 43 скилла,
24 slash-команды, контекст-стандарты, валидаторы и релизный пайплайн.
Переносим между харнесами: скиллы соответствуют стандарту Agent Skills
(agentskills.io), инструкции — этому файлу; opencode-специфика вынесена в
`opencode.json` и `PROJECT_GUIDE.md`.

## Карта системы (для любого харнеса)

- **Единственный вход**: оркестратор `openagent` классифицирует запрос и делегирует
  профильным субагентам; лёгкие вопросы выполняет сам. Полные правила — `PROJECT_GUIDE.md`.
- **Скиллы**: `skills/<name>/SKILL.md` (name + description в frontmatter, тело —
  методология). Загружаются on-demand по имени.
- **Агенты**: `agents/*.md` — frontmatter (mode, model, steps, permission) + системный промпт.
- **Команды**: `command/**/*.md` — slash-команды (`/menu` — сгенерированная карта).
- **Стандарты кода/тестов/доков и workflow-протоколы**: `context/` (вход — `context/navigation.md`).
- **Модели на агентов**: `config/model-presets.json` (пресеты quality/balanced/cost/speed).

## Базовые правила (кратко)

1. Отвечай на языке пользователя.
2. Делегируй профильные задачи профильным агентам; не делай сам работу субагента.
3. Один шаг = один смысловой коммит (Conventional Commits, без эмодзи).
4. Не заявляй «готово» без прогона проверки (см. скилл `verification-before-completion`).
5. Права инструментов — только через `permission:` в frontmatter агентов (без deprecated `tools:`).

## Харнесы

- **opencode**: основная цель — `opencode.json` (source of truth), runtime-зеркало `.opencode/`
  генерируется `npm run sync:local`. Гейты качества: `npm run validate:all`.
- **другие харнесы / «Dipsic»**: скиллы кладутся в `~/.agents/skills` через
  `npm run sync:all`; инструкции читай из этого файла + `context/`.
  Специфика миграции — `docs/PORTABILITY.md`.
