# PROJECT_GUIDE

Единый актуальный документ по системе конфигурации агентов.

## 1. Назначение
`Opencode1` — это пакет конфигурации для OpenCode-агентов: маршрутизация, режимы работы, скиллы, правила делегации, валидация и рабочие скрипты.

Цель:
- решать задачи по коду, тестам, документации и инцидентам;
- использовать актуальные практики и стек;
- оставаться компактным (без раздувания числа агентов).

## 2. Source of Truth
Приоритет источников:
1) `opencode.json`
2) `agents/**/*.md`
3) `context/**/*.md`
4) `instructions.md`

Примечание:
- `references/*` и `docs/legacy/*` не являются runtime-истиной;
- если есть конфликт, приоритет у `opencode.json` и зарегистрированных `agents/*.md`.

Если документация расходится с кодом и тестами:
- истина по поведению = код и тесты;
- документация помечается как stale/to-sync;
- запускается follow-up: `write-and-sync-docs` или `prepare-release-docs`.

## 3. Текущая архитектура
- Входной агент: `openagent` (см. `opencode.json` -> `default_agent`)
- Делегация: mode-first, затем fallback по delegation rules
- Межагентный route: строго serial (один subagent за шаг, без параллельных task() в одной ветке)
- Context discovery: `contextscout`
- Внутри discovery допускается только безопасная read-only параллелизация независимых батчей `glob`/`grep`/`read`
- One-shot: только opt-in (по явному триггеру)

## 4. Активные субагенты
- `contextscout`
- `coder`
- `debugger`
- `tester`
- `reviewer`
- `planner`
- `externalscout`
- `docwriter`
- `uitester`
- `architect`
- `devops`

Источник списка: секция `agent` в `opencode.json`.

## 5. Функциональные режимы (Functional Modes)
- `implement-feature`
- `fix-production-bug`
- `add-tests-for-module`
- `refactor-safely`
- `write-and-sync-docs`
- `prepare-release-docs`
- `modern-design`
- `modern-backend-upgrade`
- `api-change-safe`
- `architecture-design` (ADR, C4/Sequence диаграммы, системный дизайн -> `architect`)
- `infra-setup` (Docker, CI/CD, K8s, деплой, мониторинг -> `devops`)

Примечание: ID режимов и маршрутов остаются на английском как стабильные технические ключи.

## 6. Скиллы
### 6.1 Языковые (`skills/<name>/SKILL.md`)
- `csharp`
- `typescript`
- `python`
- `react-next-modern` (React 19, Next.js 15, Tailwind v4, Zustand)

Когда используются:
- code/test/debug задачи — обязательно соответствующий language skill.

### 6.2 Инструментальные (`skills/<name>/SKILL.md`)
- `context7`
  - `modern-design-research`
  - `modern-backend-research`
- `docs-sync`
  - `release-docs-sync`
- `incident-response`
- `api-change-safe`
- `database-sql` (SQL injection, ORM N+1, migrations)
- `security-owasp` (OWASP Top 10, XSS, CSRF, secret handling)
- `devops-docker` (multi-stage Docker, CI/CD, shell safety)
- `git` (strict Conventional Commits)
- `repomap`
- `ast-index` (AST symbol/usages/hierarchy search)
- `review-code-strategy`
- `review-code-checklist`
- `config-migration`
- `performance-optimization` (CPU/Memory profiling, N+1 fix, benchmarking)
- `e2e-playwright` (Playwright E2E, Page Object Model, visual testing)
- `api-openapi-spec` (OpenAPI 3.1 Spec-first, schema validation)
- `security-sast` (Static code security analysis, OWASP, dependency audit)
- `architecture-adr` (Architecture Decision Records, C4/Sequence Mermaid)
- `db-migration-safety` (Zero-downtime DB migrations, Expand-Contract)
- `mock-service-virtualization` (MSW, API mocking, offline testing)
- `observability-opentelemetry` (Distributed tracing, Prometheus, Health checks)
- `i18n-localization` (Localization standards, pluralization, Intl APIs)
- `prompt-engineering-advanced` (XML structured prompts, Few-Shot, Negative constraints)
- `caching-redis-strategy` (Cache-Aside, Redis, Cache Stampede protection)
- `grpc-graphql-contracts` (Protobuf 3, gRPC streaming, GraphQL SDL, DataLoader)
- `websocket-realtime-events` (WebSockets, SSE, Heartbeat, Redis Pub/Sub)
- `git-conflict-resolution` (3-way merge, semantic AST conflict resolution)
- `feature-flags-trunk-based` (Trunk-based dev, canary rollouts, fallback safety)
- `micro-frontends-federation` (Module Federation 2.0, singletons, event bus)
- `event-driven-messaging` (Transactional Outbox, Kafka, RabbitMQ, DLQ)
- `code-modernization-patterns` (Legacy modernization, ESM, async/await, React 19)
- `secrets-config-management` (12-Factor App config, Zod env validation, secret masking)

Когда используются:
- external libs/framework/API -> `context7`
- docs sync/release docs -> `docs-sync`
- production/runtime инциденты -> `incident-response`
- API contract/schema/status changes -> `api-change-safe`, `api-openapi-spec`, `grpc-graphql-contracts`
- E2E/UI браузерные тесты -> `e2e-playwright`, `mock-service-virtualization`
- Профилирование и hot paths -> `performance-optimization`, `caching-redis-strategy`
- Безопасность и PR review -> `security-sast`, `review-code-strategy`
- Миграции БД -> `database-sql`, `db-migration-safety`
- Инфраструктура и мониторинг -> `devops-docker`, `observability-opentelemetry`
- Интернационализация и переводы -> `i18n-localization`
- Промпт-инжиниринг и мета-агенты -> `prompt-engineering-advanced`
- Real-time и WebSockets -> `websocket-realtime-events`
- Разрешение конфликтов Git -> `git-conflict-resolution`
- Раскатка фич и флаги -> `feature-flags-trunk-based`
- Микрофронтенды -> `micro-frontends-federation`
- Асинхронные события и очереди -> `event-driven-messaging`
- Модернизация старого кода -> `code-modernization-patterns`
- Переменные окружения и секреты -> `secrets-config-management`

## 7. One-shot режим
По умолчанию OFF.

Явные триггеры включения:
- `one-shot: on`
- `/oneshot ...`
- `сделай под ключ`

Явное отключение:
- `one-shot: off`

Без триггера one-shot запрещен.

## 8. Quality Gates
Обязательные команды:
- `npm run validate:all`
- `npm run validate:runtime`
- `npm run smoke:functional`

Если любой gate не проходит — результат не считается готовым.

## 9. Установщик и обновление
- Локальная установка: `npm run install:local -- --target=<path>`
- Локальная проверка обновлений: `npm run update:local -- --target=<path> --check`

## 10. GitHub/Git качество
- Используем `git` skill при задачах с коммитами/PR.
- Коммит не обязателен для каждого шага: коммитим только завершенные и полезные изменения.
- Один коммит = один смысловой шаг.
- PR без шума: clear summary, validation, risks.

## 11. Политика качества (человеческий уровень)
Цель — не "маскировка", а реально сильный инженерный результат:
- писать конкретно и по фактам проекта;
- избегать шаблонной воды и повторов;
- обосновывать решения (почему именно так);
- сохранять единый стиль терминов и контрактов;
- проверять согласованность: код <-> тесты <-> docs.

**Глобальные правила (GSD & Market Best Practices):**
- **[DILIGENCE] ("MAKE NO MISTAKES")**: Агенты (coder, reviewer) обязаны концентрироваться на бескомпромиссном качестве, дважды проверяя логику и безопасность перед выводом.
- **Атомарные сохранения (Atomic Saves)**: После завершения задачи агент обязан зафиксировать результат: создать атомарный Git-коммит (по Conventional Commits), либо, если Git не инициализирован, скопировать измененные файлы в резервную директорию `.opencode/history/<timestamp>_<task>/`.
- **Строгий XML-формат**: Делегирование задач (например, от `planner`) происходит в строгом формате XML-тегов (например, `<task>...</task>`) для исключения двусмысленностей при парсинге.

Для документации:
- короткие, полезные, проверяемые формулировки;
- явные шаги/критерии done;
- обновление в момент изменения поведения, а не "потом".

Для кода:
- минимальные целевые изменения;
- читаемость и предсказуемость важнее "хитрых" решений;
- перед финалом обязательный self-check качества.

## 12. Ключевые механизмы (Global Skills, Debugger, Localization)
- **Universal Global Skills**: Агенты (`coder`, `tester`, `debugger`) используют name-based вызов скиллов (например, `skill({ name: "typescript" })`) и fallback-чтение manifest-файлов: `read("~/.config/opencode/skills/<name>/SKILL.md")` (на Windows: `%USERPROFILE%/.config/opencode/skills/<name>/SKILL.md`). Это гарантирует discoverable-layout и переносимость.
- **Dynamic Debugger**: Агент `debugger` больше не угадывает команды сборки (hardcoded `dotnet build`). Он анализирует контекст ошибки: запускает напрямую указанные `.bat`/`.sh` скрипты, ищет точки входа в `package.json` или `Makefile`. Если информации нет, запрашивает команду через `question tool`.
- **UI Localization Enforcement**: В `openagent` внедрен чек: при необходимости генерации UI и отсутствии языка в настройках он ОДИН раз запрашивает предпочитаемый язык интерфейса и сохраняет его в `.opencode/project_settings.json`. Агент `coder` строго придерживается этой настройки при генерации визуальных компонентов.

## 13. Политика references
- `references/*` — только benchmark/read-only.
- Использовать как runtime source of truth запрещено.

## 14. История и архив
- Архитектурная карта системы: `docs/architecture/system_map.md`.
- Каталог скриптов и npm-команд: `docs/modules/scripts.md`.
- Атомарные бэкапы `.opencode`-файлов (создаются инструментами перед записью): `.opencode/history/`.
- Журнал всех изменений и обоснований: `CHANGELOG.md`; трекер задач: `PLANS.md`.

## 15. Практичные архитектурные улучшения
- Качество: запускать `npm run validate:all` перед merge и фиксировать результат в PR/отчете.
- Тесты: для каждого изменения поведения добавлять минимум один проверяющий тест или smoke-check сценарий.
- Релизные проверки: перед релизом обязательный прогон `validate:runtime` + `smoke:functional` на чистом окружении.
- Наблюдаемость и операции: для инцидентов вести короткий лог `симптом -> причина -> fix -> rollback`, чтобы ускорять повторную диагностику.
