---
description: Интерактивная карта мультиагентной системы, бюджеты шагов, права на файлы и реестр 45 навыков
---

# Matrix Command | Команда /matrix

## Назначение
Вывести подробную живую матрицу всех 12 активных агентов, их моделей (пресет `/presets`), бюджетов шагов (`steps`), прав записи, полного реестра из 45 специализированных навыков и 24 slash-команд.

## Вход
- `/matrix` — вывод полной таблицы агентов и навыков (эквивалент `npm run matrix`)
- `/matrix <агент>` (например, `/matrix coder` или `/matrix devops`) — детальная карточка конкретного агента

## Пример вывода (`node scripts/agent-matrix.mjs`)
```
🤖 Active Agents (12):

| Agent ID       | Steps | Model                         | Role                            | Write Permissions             |
| :------------- | :---- | :---------------------------- | :------------------------------ | :---------------------------- |
| architect      |    30 | antigravity-claude-opus-4-5-thinking:low | Системный архитектор — проектир | edit, write, patch            |
| coder          |    50 | antigravity-gemini-3-pro:high | Супер-кодер — любой язык + TDD  | edit, write, patch            |
| contextscout   |    30 | antigravity-gemini-3-flash:minimal | Субагент для поиска и извлечени | Read-only                     |
| debugger       |    25 | antigravity-gemini-3-pro:high | Агент для автоматического исправ | edit, write, patch           |
| devops         |    30 | antigravity-gemini-3-pro:low  | DevOps & Infrastructure Engineer | edit, write, patch           |
| docwriter      |    15 | antigravity-gemini-3-flash:medium | Автогенерация и обновление док | edit, write, patch            |
| externalscout  |    25 | antigravity-gemini-3-flash:minimal | Получает актуальную документаци | Read-only                    |
| openagent      |    50 | antigravity-gemini-3-pro:high | Универсальный ассистент — коорд | edit, write, patch            |
| planner        |    40 | antigravity-gemini-3-pro:high | Unified Planner Agent - Task de | edit, write, patch            |
| reviewer       |    40 | antigravity-claude-sonnet-4-5 | Code Review агент - безопасность | Read-only                    |
| tester         |    25 | antigravity-claude-sonnet-4-5 | TDD-агент для создания тестов  | edit, write, patch            |
| uitester       |    25 | antigravity-gemini-3-flash:low | Visual UI Tester - проверяет ви | Read-only                    |
| uitester       |    25 | Visual UI Tester - проверяет визуальную ве | Read-only                     |

🛠️  Validated Skills (45 total):
`api-change-safe`, `api-openapi-spec`, `architecture-adr`, `ast-index`, `caching-redis-strategy`, `code-modernization-patterns`, `config-migration`, `context7`, `csharp`, `database-sql`, `db-migration-safety`, `devops-docker`, `docs-sync`, `e2e-playwright`, `event-driven-messaging`, `feature-flags-trunk-based`, `frontend-design`, `git`, `git-conflict-resolution`, `grpc-graphql-contracts`, `i18n-localization`, `incident-response`, `micro-frontends-federation`, `mock-service-virtualization`, `observability-opentelemetry`, `performance-optimization`, `prompt-engineering-advanced`, `python`, `repomap`, `react-next-modern`, `requesting-code-review`, `review-code-checklist`, `review-code-strategy`, `root-cause-tracing`, `secrets-config-management`, `security-owasp`, `security-sast`, `systematic-debugging`, `test-driven-development`, `typescript`, `verification-before-completion`, `websocket-realtime-events`, `writing-plans`, `playwright-cli`, `agent-browser`

⚡ Slash Commands (24 total):
/arch, /bootstrap, /budget, /build-context-system, /commit, /conflict, /docgen, /doctor, /heal, /i18n, /infra, /matrix, /modernize, /optimize, /oracle, /plan, /presets, /pr, /prompt, /prompt-engineering/prompt-optimizer, /release, /review, /synthesize, /test
```

## Права записи
Колонка `Write Permissions` отражает `permission.edit` агента (единый механизм после ухода с deprecated `tools:` карт; `edit` также покрывает `write`/`patch`): `contextscout`, `externalscout`, `reviewer`, `uitester` — строго read-only (`edit: deny`), bash у contextscout запрещён на уровне `permission.bash: "deny"`. Колонка `Model` — назначение из активного пресета (см. `/presets`).

Бюджеты шагов берутся из фронтматтера `agents/*.md` (единый источник истины) и валидируются при каждом `npm run validate:all`.
