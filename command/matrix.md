---
description: Интерактивная карта мультиагентной системы, бюджеты шагов, права на файлы и реестр 40 навык
---

# Matrix Command | Команда /matrix

## Назначение
Вывести подробную живую матрицу всех 12 активных агентов, их моделей (пресет `/presets`), бюджетов шагов (`steps`), прав записи, полного реестра из 40 специализированных навыков и 25 slash-команд.

## Вход
- `/matrix` — вывод полной таблицы агентов и навыков (эквивалент `npm run matrix`)
- `/matrix <агент>` (например, `/matrix coder` или `/matrix devops`) — детальная карточка конкретного агента

## Пример вывода (`node scripts/agent-matrix.mjs`)
```
🤖 Active Agents (12):

| Agent ID       | Steps | Model                         | Role                            | Write Permissions             |
| :------------- | :---- | :---------------------------- | :------------------------------ | :---------------------------- |
| architect      |    30 | glm-5.3                       | Системный архитектор — проектирование расп | edit, write, patch            |
| coder          |    50 | dashscope-2/glm-5.3           | Супер-кодер — любой язык + TDD mode + глуб | edit, write, patch            |
| contextscout   |    30 | opencode-free-1/space-bunny-free | Субагент для поиска и извлечения релевантн | Read-only                     |
| debugger       |    25 | glm-5.3                       | Агент для автоматического исправления ошиб | edit, write, patch            |
| devops         |    30 | dashscope-2/glm-5.3           | DevOps & Infrastructure Engineer — Docker, | edit, write, patch            |
| docwriter      |    15 | opencode-free-1/space-bunny-free | Автогенерация и обновление документации | edit, write, patch            |
| externalscout  |    25 | opencode-free-1/space-bunny-free | Получает актуальную документацию библиотек | Read-only                     |
| openagent      |    50 | glm-5.3                       | Универсальный ассистент — координация, воп | edit, write, patch            |
| planner        |    40 | dashscope-2/glm-5.3           | Unified Planner Agent - Task decomposition | edit, write, patch            |
| reviewer       |    40 | dashscope-2/glm-5.3           | Code Review агент - безопасность, качество | Read-only                     |
| tester         |    25 | glm-5.3                       | TDD-агент для создания тестов - Test-Drive | edit, write, patch            |
| uitester       |    25 | dashscope-2/qwen3.8-flash     | Visual UI Tester — проверяет визуальную ве | Read-only                     |

🛠️  Validated Skills (40 total):
`api-change-safe`, `api-openapi-spec`, `architecture-adr`, `ast-index`, `code-modernization-patterns`, `config-migration`, `context7`, `csharp`, `database-sql`, `devops-docker`, `docs-sync`, `domain-modeling`, `e2e-playwright`, `frontend-design`, `git`, `git-conflict-resolution`, `handoff`, `i18n-localization`, `incident-response`, `mock-service-virtualization`, `observability-opentelemetry`, `performance-optimization`, `playwright-cli`, `prompt-engineering-advanced`, `prototype`, `python`, `react-next-modern`, `repomap`, `requesting-code-review`, `review-code-checklist`, `review-code-strategy`, `root-cause-tracing`, `secrets-config-management`, `security-owasp`, `security-sast`, `systematic-debugging`, `test-driven-development`, `typescript`, `verification-before-completion`, `writing-plans`

⚡ Slash Commands (25 total):
/arch, /bootstrap, /budget, /build-context-system, /commit, /conflict, /docgen, /doctor, /heal, /i18n, /infra, /matrix, /modernize, /oneshot, /optimize, /oracle, /plan, /presets, /pr, /prompt, /prompt-engineering/prompt-optimizer, /release, /review, /synthesize, /test
```

## Права записи
Колонка `Write Permissions` отражает `permission.edit` агента (единый механизм после ухода с deprecated `tools:` карт; `edit` также покрывает `write`/`patch`): `contextscout`, `externalscout`, `reviewer`, `uitester` — строго read-only (`edit: deny`), bash у contextscout запрещён на уровне `permission.bash: "deny"`. Колонка `Model` — назначение из активного пресета (см. `/presets`).

Бюджеты шагов берутся из фронтматтера `agents/*.md` (единый источник истины) и валидируются при каждом `npm run validate:all`.
