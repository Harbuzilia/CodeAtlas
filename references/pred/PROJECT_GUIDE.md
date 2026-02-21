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
2) `.opencode/agent/**/*.md`
3) `context/**/*.md`
4) `instructions.md`

Если документация расходится с кодом и тестами:
- истина по поведению = код и тесты;
- документация помечается как stale/to-sync;
- запускается follow-up: `write-and-sync-docs` или `prepare-release-docs`.

## 3. Текущая архитектура
- Входной агент: `core/openagent`
- Делегация: mode-first, затем fallback по delegation rules
- Context discovery: `subagents/core/contextscout`
- One-shot: только opt-in (по явному триггеру)

## 4. Активные субагенты
- `subagents/core/contextscout`
- `subagents/code/coder-agent`
- `subagents/core/debugger`
- `subagents/code/tester`
- `subagents/code/reviewer`
- `planning/decomposition`
- `subagents/research/externalscout`
- `subagents/core/docwriter`

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
### 6.1 Языковые (`skill/languages/`)
- `csharp.md` (обновлен: human-grade protocol + modern tooling)
- `typescript.md` (обновлен: human-grade protocol + modern tooling)
- `python.md` (обновлен: human-grade protocol + modern tooling)

Когда используются:
- code/test/debug задачи — обязательно соответствующий language skill.

### 6.2 Инструментальные (`skill/tools/`)
- `context7.md`
  - `modern-design-research`
  - `modern-backend-research`
- `docs-sync.md`
  - `release-docs-sync`
- `incident-response.md`
- `api-change-safe.md`

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
- Локальная установка: `npm run install:local -- --target=<path>`
- Локальная проверка обновлений: `npm run update:local -- --target=<path> --check`

## 10. GitHub/Git качество
- Используем `skill/tools/git.md` при задачах с коммитами/PR.
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

Для документации:
- короткие, полезные, проверяемые формулировки;
- явные шаги/критерии done;
- обновление в момент изменения поведения, а не "потом".

Для кода:
- минимальные целевые изменения;
- читаемость и предсказуемость важнее "хитрых" решений;
- перед финалом обязательный self-check качества.

## 12. Политика references
- `references/*` — только benchmark/read-only.
- Использовать как runtime source of truth запрещено.

## 13. История и архив
- Исторические снапшоты:
  - `docs/legacy/history/AUDIT_REPORT.md`
  - `docs/legacy/history/SUMMARY.md`
- Архив:
  - `docs/legacy/archive/`
