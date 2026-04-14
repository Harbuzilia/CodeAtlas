# PROJECT_GUIDE

Единый актуальный документ по системе конфигурации агентов.

## 1. Назначение
`CodeAtlas` — это основной пакет конфигурации для OpenCode-агентов: маршрутизация, режимы работы, скиллы, правила делегации, валидация и рабочие скрипты.

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
- `references/*` не являются runtime-истиной;
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

Примечание: ID режимов и маршрутов остаются на английском как стабильные технические ключи.

## 6. Скиллы
### 6.1 Языковые (`skills/<name>/SKILL.md`)
- `csharp`
- `typescript`
- `python`

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
- `ast-index`
- `review-code-strategy`
- `review-code-checklist`
- `config-migration`

Когда используются:
- external libs/framework/API -> `context7`
- docs sync/release docs -> `docs-sync`
- production/runtime инциденты -> `incident-response`
- API contract/schema/status changes -> `api-change-safe`

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
- Установка/обновление: `npx opencode-init --target=<path>`
- Локальный запуск из пакета: `node scripts/install.mjs --target=<path>`
- Установщик копирует runtime-файлы в `<path>/.opencode/`, включая bundled `bin/ast-index.exe`.
- Отдельные `install:local` / `update:local` команды больше не поддерживаются; для refresh повторно запускается тот же установщик поверх существующей `.opencode/` директории.

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
- Исторические или исследовательские материалы не должны формировать публичную поверхность runtime-репозитория.
- Локальные служебные артефакты (`.opencode/task_state.md`, repomap-выгрузки, временные архивы) должны оставаться вне коммитов.

## 15. Практичные архитектурные улучшения
- Качество: запускать `npm run validate:all` перед merge и фиксировать результат в PR/отчете.
- Тесты: для каждого изменения поведения добавлять минимум один проверяющий тест или smoke-check сценарий.
- Релизные проверки: перед релизом обязательный прогон `validate:runtime` + `smoke:functional` на чистом окружении.
- Наблюдаемость и операции: для инцидентов вести короткий лог `симптом -> причина -> fix -> rollback`, чтобы ускорять повторную диагностику.
