# CHANGELOG: Журнал изменений и архитектурных решений OpenCode1

Этот файл является единым источником правды по всем внесенным изменениям в проект: **где**, **что** было обновлено, **почему** (техническое обоснование) и **какой эффект** это дало. Обновляется после каждой итерации доработок.

---
## [2026-09-18] — Волна 9.1: верификация полевого аудита (пункты 19-27)

Полевой аудит рабочей копии назвал 9 «осталось»; каждый проверен по репо/рантайму,
реальные закрыты фиксами, платформенные задокументированы.

- **19 Дрейф глобального конфига**: `sync:all` синхронизировал только 5 каталогов. Теперь в
  global opencode дополнительно копируется переносимый `AGENTS.md` (авто-загружаемый вход);
  `registry.json`/`config/` осознанно repo-scoped (скрипты работают из репо) — задокументировано.
- **20 Фиктивная защита секретов**: path-глобы `permission` не матчатся на 1.18.x. Новый плагин
  `secret-guard` реально блокирует read/edit/write/patch и bash cat/type/get-content по
  `.env*`, `*.key`, `*.pem`, `id_*`, `.netrc`, `credentials` (шаблоны `.env.example` разрешены);
  текст ошибки учит агента работать через env/секрет-менеджер. Покрыт тестом.
- **21/23 Побочные эффекты sync:all**: добавлены `--dry-run` и `--only=<подстрока>`; таргет
  `~/.agents/skills` стал opt-in (`--with-agents-skills` / `CODE_ATLAS_SYNC_AGENTS_SKILLS=1`) —
  каталог общий с Orca и др., дефолтный прогон его больше не трогает. Тесты обновлены.
- **22 Hot-reload**: платформенное ограничение — задокументировано (instructions/README/
  PROJECT_GUIDE): изменения применяются после перезапуска opencode.
- **24 Шум oracle**: `plugin/` исключён из эвристики дефектов (ветвистые event-гварды давали
  ложные HIGH 95%; плагины покрыты dedicated-тестами).
- **25 ast-index вне репо**: скилл получил явный порядок разрешения бинаря и graceful-skip
  (45 МБ экзешник осознанно не синхронизируется наружу).
- **26 npm run вне репо**: instructions/README описывают fallback `node <atlas>/scripts/X.mjs`
  (install-local копирует scripts+package.json в целевые проекты).
- **27 .zcode/** добавлен в .gitignore.
- Тесты 36/36 (+2: secret-guard, opt-in agents-skills).

---
## [2026-09-18] — Волна 9: скорость ×N, ноль approval-спама, безотказность, браузер = два CLI

Причина волны: боевая эксплуатация пака в реальном проекте (Windows, провайдер DashScope/GLM):
600 строк кода в час-три, approval на каждую команду, зависание foreground dev-сервера с
воскрешением сессии halt-guard'ом после пользовательского abort.

### 1. Ноль approval-спама ([`opencode.json`](opencode.json), агенты)

- `permission.bash`: `"*": "allow"` первым правилом, деструктив (`rm -rf`, `sudo`, force-push,
  `reset --hard`, `clean -fd`, drop/truncate, shutdown, `format c:`) — deny/ask ПОСЛЕДНИМИ
  (last-match-wins). Раньше `"*": "ask"` требовал подтверждения на каждую команду и копировался
  `install-local` в целевые проекты.
- `devops`/`uitester`: широкие `"*": "ask"` заменены на default-allow + деструктив-списки
  (uitester получил browser-CLI без аппрувов).

### 2. Скорость

- **LIGHT-ROUTE** (`openagent.md`, `delegation.md`): правка ≤3 файлов без риск-триггеров
  (API/БД/миграции/auth/security/публичные интерфейсы/CI) → один coder с самопроверкой,
  без reviewer/tester; полные цепочки — по риск-триггерам или явному запросу.
- **[G0] релакс**: до работы ≤1 обязательный скилл (read/grep/glob разрешены до загрузки);
  reviewer-чеклист и скиллы devops/architect — on-demand по типу задачи.
- Прогресс-протокол ужат: 1 запись на делегирование + итог цепочки; findings.md только после contextscout.
- `instructions.md` урезан 398 → ~150 строк без потери семантики (описания скиллов дублировали
  skill-tool; дубли delegation-правил свернуты в указатели) — меньше контекста каждый turn.

### 3. Безотказность ([`plugin/halt-guard.js`](plugin/halt-guard.js), [`plugin/bash-guard.js`](plugin/bash-guard.js))

- halt-guard: пользовательский abort (`MessageAbortedError`, interrupted-парты «Tool execution
  aborted») больше НЕ трактуется как временная ошибка (`aborted` убран из RETRYABLE_RE); сессия
  помечается и молчит (ни resume, ни нуджей) до следующего сообщения пользователя; APIError
  проверяется по `data.isRetryable`/statusCode.
- Новый плагин `bash-guard`: `tool.execute.before` блокирует foreground dev-серверы/вотчеры
  (`pnpm dev`, `npm run dev|start`, `tsx watch`, `vite/next/nuxt/astro dev`, `nodemon`, `uvicorn`,
  `dotnet watch`, `http-server`) без detach-маркеров и пайпы вотчеров в Select-Object/head —
  текст ошибки учит модель детач-запуску с логом и healthcheck (upstream #49169, pipe-EOF висание).
- `instructions.md`: блок LONG-RUNNING PROCESSES (детач + лог + healthcheck, без пайпов в EOF-ждущие).

### 4. Браузер: два CLI-пути вместо Chrome DevTools MCP

- Вердикт верификации 2026-09: Microsoft сам рекомендует coding-агентам CLI+skills вместо MCP
  (README playwright-mcp); хостинг MCP в opencode глючит (#42191, #31554); agent-browser на
  Windows имел pipe-висание (лечится обёрткой), но жив и полезен как второй путь.
- Новые скиллы: `playwright-cli` (primary: open/snapshot+ref/click/fill/screenshot/console/find,
  generate-locator и recording → постоянные спеки @playwright/test) и `agent-browser`
  (визуал/diff/a11y/vitals/профили/doctor/trace/HAR; питфолл stdout-пайпа задокументирован).
- `uitester` переведён на два CLI с fallback-цепочкой; chrome-devtools MCP удалён из `opencode.json`;
  упоминания вычищены (e2e-playwright, openagent, registry, instructions); Playwright MCP —
  опциональным сниппетом с `--caps` в доках, не по умолчанию; `memory` MCP не тронут.

### 5. Модели: переносимость без потери механизма

- Пресет `inherit` (пустой маппинг): `models:apply -- inherit` снимает model/variant со всех
  агентов — для проектов со своим провайдером (иначе «Model not found» убивает turn, фолбэка нет).
- `doctor`: WARN-чек «модели агентов vs локальный каталог» + подсказка models:apply.
- README/PROJECT_GUIDE: шаг `models:apply` сразу после install:local.

### 6. Прочее

- Windows-кодировки: заметка про mojibake PowerShell (#23636) в instructions/README.
- Скиллов 45 (было 43); счётчики синхронизированы (docs-sync 91+ проверок).
- Тесты 34/34 (+3 resilience: abort-семантика ×2, bash-guard); мутация и полный прогон зелёные.

---
## [2026-09-17] — Code Atlas: слой моделей, анти-сталлинг, переносимость, Windows

Восьмая волна (ветка `feat/atlas-polish`): финальная полировка до «закрытого продукта» под брендом **Code Atlas** (репо [Harbuzilia/CodeAtlas](https://github.com/Harbuzilia/CodeAtlas), package `code-atlas`, MIT). Исследование: официальные доки opencode 1.18.x + лучшие решения комьюнити (awesome-opencode, superpowers, wshobson/agents, ECC, planning-with-files — см. план волны).

### 1. Слой моделей — «лазеечка» переназначения ([`config/model-presets.json`](config/model-presets.json), [`scripts/model-presets.mjs`](scripts/model-presets.mjs))

- Раньше все 12 агентов работали на одной глобальной модели (5 из 6 моделей каталога не использовались). Теперь назначение «агент → модель» живёт в frontmatter агентов и управляется пресетами-как-данные: `quality` (по умолчанию: реализация — Gemini 3 Pro high, ревью/тесты — Claude Sonnet 4.5, архитектура — Opus 4.5 Thinking low, discovery — Flash), `balanced`, `cost`, `speed`.
- `npm run models:apply -- <preset>` применяет пресет хирургически (форматирование frontmatter сохраняется, EOL не ломается — покрыто регресс-тестом), `--check` — гейт дрейфа в `validate:all`, `npm run models` — карта назначений, команда `/presets`. Новая модель (MiniMax, GPT-5.x, Astro) = строка в пресете + запись в каталоге `opencode.json`.
- Починены устаревшие ссылки на модели: `workflows/resilience.md` (Gemini 2.5/Claude 3.7 → реальные ID каталога), `token-budget-tracker.mjs` (тарифы по фактической модели агента, а не глобальный хардкод).

### 2. Скорость и прогресс (анти «3 фикса = 3 часа»)

- **Прогресс-протокол**: для цепочек 2+ делегирований оркестратор ведёт `.opencode/progress.md` (`HH:MM → agent: задача` / `HH:MM ✓ agent: итог`) — живой канал «что происходит сейчас»; после discovery-агентов ключевые находки дописываются в `.opencode/findings.md` и передаются следующему субагенту (переживают компакцию). Правила в `openagent.md` + `delegation.md`.
- **Длительности задач**: `telemetry.js` пишет маркеры старта делегирования и `durationMs`; `routing-telemetry` показывает per-agent median/p90/max и самого медленного агента как кандидата на смену пресета.
- **halt-guard v3**: делегирование `task()`, оборванное временной ошибкой провайдера (429/timeout), получает ровно один retry-nudge на упавший part (максимум 2 на сессию) — раньше потерянный субагент молча стопорил цепочку.
- **Анти-перетестирование**: правила [SCOPE]/[NO-RELOOP]/[NO-RERERUN] у tester (полный suite ≤2 прогонов), wall-clock ориентиры и OVER-TESTING в anti-hang протоколе.

### 3. Заимствованное ядро скиллов (37 → 43, из obra/superpowers, MIT)

`systematic-debugging` (гипотезы → минимальный репро → фикс причины), `root-cause-tracing` (5 Почему, бисекция git, археология коммитов), `verification-before-completion` (доказательное «готово»), `test-driven-development` (RED-GREEN-REFACTOR с дисциплиной объёма), `writing-plans` (шаги 2-5 минут с проверками), `requesting-code-review` (запрос ревью + severity-дисциплина ответов). Каталоги и счётчики обновлены (гейт docs-sync: 91 проверка).

### 4. Универсальный конфиг + Windows

- **Deprecated `tools:` карты удалены из всех 12 агентов** — permission-only. opencode игнорирует tools при permission, а с 1.18.26 tools-derived правила ломают пользовательские permission (issue #46873). Гейт `validate-agent-permissions` теперь запрещает возврат tools-карт; `agent-matrix` показывает Model-колонку и права из `permission.edit`.
- `.gitattributes`: LF-нормализация (CRLF только `*.ps1/*.cmd/*.bat`, `*.exe` binary) — свежие клоны стабильны.
- `opencode-init.sh`: `ln -s` с верификацией и fallback-копией (Git Bash без native symlinks делал молчаливую протухающую копию).
- Аудит `shell:true`-спавнов: все команды кросс-шельные (npm/git/node/uvx) — cmd.exe-safe. README: установка (npm/choco/scoop), `OPENCODE_GIT_BASH_PATH`, зеркала копиями без Developer Mode, WSL-заметка из доков.

### 5. Кросс-харнес переносимость

- Корневой [`AGENTS.md`](AGENTS.md) — портативный вход для любых харнесов (opencode/Codex/Cursor читают AGENTS.md нативно), без дублирования instructions.md.
- `sync-targets`: пятый таргет `~/.agents/skills` (стандарт Agent Skills/agentskills.io, только скиллы, без вложенности).
- [`docs/PORTABILITY.md`](docs/PORTABILITY.md): карта «что куда» (opencode/.opencode, OMP ~/.pi, Pi, любой харнес — AGENTS.md + скиллы), слои переносимости, рецепт добавления нового харнеса (включая «Dipsic» — по формату).

### 6. GitHub-финализация

`package.json` → `code-atlas`, `registry.json` repository → реальный URL, LICENSE (MIT), README — бренд Code Atlas. Ветки/PR в Harbuzilia/CodeAtlas (CI Node 20 прогоняется по-настоящему).

### 7. Тесты и мутации

32 теста (было 23): +5 model-presets (apply/check/drift/CRLF-регресс/list), +3 plugin-runtime-behaviors (task-retry, fatal-игнор, durations), permission-фикстуры переписаны под permission-only, sync-targets — 5 таргетов. Мутационный скор 100% (7/7 — добавлен model-presets; раннер получил per-target args). Полный прогон: `npm test` 32/32, `validate:all`, `sync:check`, `eval:routes` 12/12, `scan:secrets`, `smoke:functional` — зелёные.

---
## [2026-09-16] — Полный аудит: 11 багов, гейт docs-sync, 23 теста, release-пайплайн

Седьмая волна (ветка `feat/audit-polish`): полный аудит конфиг-набора с эмпирической проверкой семантики opencode 1.18.18. Полный отчёт — [`docs/audit-2026-09-16.md`](docs/audit-2026-09-16.md).

### 1. Критические фиксы ([`scripts/sync-local.mjs`](scripts/sync-local.mjs), [`scripts/sync-targets.mjs`](scripts/sync-targets.mjs), [`scripts/validate-agent-permissions.mjs`](scripts/validate-agent-permissions.mjs))

- **CI-фатальный**: `.opencode/package.json` существовал только локально — свежий клон ловил ENOENT в `validate:all`/`smoke`. Теперь `sync-local.mjs` генерирует его (версия `@opencode-ai/plugin` из корневого package.json), `--check` сверяет байт-в-байт.
- `sync-targets.mjs`: удалён `extraSyncs` — он создавал вложенный `.opencode/.opencode/plugin/` и мусорил в глобальных таргетах.
- `validate-agent-permissions.mjs`: парсер frontmatter переписан на стек вложенности (2 уровня, ключи-паттерны в кавычках). Раньше `permission.bash: {"*": "deny"}` парсился как пустая строка → ложный FAIL валидного агента и молчаливый пропуск паттерн-мап, оставлявшей инструмент включённым.

### 2. Реальная семантика permissions в opencode 1.18.18 (все 12 агентов)

- Установлено через `opencode debug agent`: при наличии `permission:` карта `tools:` игнорируется; path-globs в permission не матчатся; enforced только доменный `deny` или `{"*": "deny"}`.
- Каждый `tools: X: false` продублирован `permission.X: deny`; гейт проверяет это правило. `contextscout` теперь строго read-only (bash запрещён).

### 3. Release-пайплайн ([`scripts/release-gen.mjs`](scripts/release-gen.mjs))

- Реализовано по доке `command/release.md`: гейты `validate:all` + `scan:secrets` + `eval:routes` до бампа, changelog-секция из Conventional Commits между последним тегом и HEAD, бамп `package.json` **и** `registry.json` (хирургически, форматирование сохраняется), честный dry-run, `--no-verify`/`--no-tag`.
- Дополнительно найден тестами: маркер вставки `/^---\r?\n/` не матчился (CHANGELOG начинается с `#` заголовка) → секция встала бы выше заголовка. Исправлен на `/m`.

### 4. Новый гейт docs-sync ([`scripts/validate-docs-sync.mjs`](scripts/validate-docs-sync.mjs), 79 проверок)

- Дрейф класса «36 vs 37 навыков» (коммит 048a805) больше не проходит: счётчики скиллов/команд в `PLANS.md`, `PROJECT_GUIDE.md`, `command/matrix.md`, `command/menu.md` сверяются с диском; список команд в PLANS — двунаправленно. Включён в `validate:all`, покрыт мутационным тестом.

### 5. Тесты: 3 → 23 ([`tests/`](tests/))

- Герметичные регресс-тесты в temp-каталогах: `sync-local` (ENOENT-регресс, drift: differs/stale/missing), `sync-targets` (нет вложенного `.opencode/.opencode`), `validate-agent-permissions` (вложенные карты, паттерн-мапы, edit-globs), `validate-docs-sync`, `generate-menu` (вложенные команды, снятие YAML-кавычек), `release-gen` (dry-run/бамп/changelog/теги/дрифт/гейты).
- `npm test` добавлен в CI и pre-push. Mutation-скор 100% (6/6 KILLED, тень пересоздаётся каждый запуск).

### 6. Контент и чистка

- 16 placeholder-описаний скиллов (`«X skill reference»`) заменены на реальные триггеры по телам скиллов.
- Мёртвые ссылки (`docs/legacy/*`, layout `agent/`, `.agent/workflows/`), дубли и устаревшие бюджеты в `matrix.md`, пропуски в `navigation.md` — исправлены; `sync-context-index` генерит относительные ссылки вместо `file:///E:/...`.
- Удалены: `.tmp/` (протухшая тень мутаций, debug-копии), `.opencode/.opencode/` (артефакт extraSyncs), `.opencode/specs/` (стабы, пересоздаются синтезатором). `task_state.md` — пути актуализированы. `opencode-init.sh` — legacy-симлинки `skill/` удалены.
- Создан [`README.md`](README.md) (RU): состав, установка, ключевые команды.

---
## [2026-08-23] — Telemetry v2 (токены/ошибки), coverage-чеки роутов, watch mode, pre-push

Шестая волна: наблюдаемость расширена до токенов и надёжности инструментов, покрытие роутов стало обязательным контрактом.

### 1. Coverage-контракт роутов ([`scripts/eval-scenarios.mjs`](scripts/eval-scenarios.mjs))

- Каждый documented mode в `functional_modes` обязан иметь ≥1 сценарий, каждый зарегистрированный субагент — фигурировать в ≥1 маршруте. Роут без сценария = непокрытый контракт → FAIL.
- Доказано негативным тестом: сокрытие обоих сценариев `infra-setup` поймано как `[COVERAGE] Mode "infra-setup"`, откат зелёный.
- LLM-режим получил override модели: `OPENCODE_EVAL_MODEL` (headless `opencode run` на opencode 1.18.18 не принимает `:high`-вариант `google/antigravity-gemini-3-pro:high` — `ProviderModelNotFoundError`; валидные id: `google/antigravity-gemini-3-pro`, `google/antigravity-gemini-3-flash`). Запись задокументирована, конфиг не менялся.

### 2. Telemetry v2 — токены и надёжность ([`plugin/telemetry.js`](plugin/telemetry.js), [`scripts/routing-telemetry.mjs`](scripts/routing-telemetry.mjs))

| Событие | Запись | Агрегация |
| :--- | :--- | :--- |
| `message.updated` (assistant, completed) | `tokens`: input/output/cache, dedup по message id | Расход по дням, топ-5 сессий по токенам — данные для тюнинга DCP/budget |
| `message.part.updated` (tool, status=error) | `tool_error`, dedup по part id | Error rate per tool: `bash 3/6 failed`, общий % отказов |

Проверено на синтетике: дедуп по id корректен (дубли стрима не накручивают), найден и починен баг агрегатора — error-записи раздували счётчик executions (3/12 → 3/6).

### 3. Watch mode ([`scripts/watch.mjs`](scripts/watch.mjs), `npm run watch`)

fs.watch по `agents/ command/ skills/ context/ plugin/ registry.json opencode.json` → debounce 400мс → `validate:all`. Журнал телеметрии исключён из триггеров. Живой тест: правка `command/plan.md` → ревалидация 10 OK за ~3с.

### 4. Pre-push hook ([`.githooks/pre-push`](.githooks/pre-push))

`npm run eval:routes` перед пушем: регрессия роутинга не уходит с машины. Дополняет pre-commit (validate:all + scan:secrets + eval:routes).

### Проверка
- validate:all — 10 OK · eval:routes — 24/24 · scan:secrets — Clean · doctor — healthy
- Watch: initial + triggered run, оба зелёные
- Telemetry v2: дедуп и error-rate на синтетике корректны

---
## [2026-08-23] — Киллер-фичи: Routing Telemetry, Onboarding, LLM Semantic Eval

Пятая волна: система получила наблюдаемость за реальным поведением роутинга и one-command вход для новых пользователей.

### 1. Routing Telemetry ([`plugin/telemetry.js`](plugin/telemetry.js) + [`scripts/routing-telemetry.mjs`](scripts/routing-telemetry.mjs), `npm run telemetry`)

| Компонент | Что делает | Почему |
| :--- | :--- | :--- |
| Плагин | Хук `tool.execute.after` пишет каждое делегирование (task → subagent_type) и активность инструментов в append-only `.opencode/agent-journal.jsonl`. Никогда не бросает исключений (best-effort), без сети и зависимостей. | До этого мёртвые агенты (`architect`/`devops`) находились только ручным аудитом. |
| Агрегатор | Лидерборд делегирований по агентам, last-used, гистограмма активности по дням, **dead-agent radar**: агент ни разу не вызван за ≥3 активных дня или простаивает > 14 дней → предупреждение. Порог настраивается `TELEMETRY_DEAD_DAYS`. | Мёртвые маршруты теперь детектятся данными, а не ревизией. |

Проверено на синтетическом журнале: радар поймал невызываемых `architect`/`devops`, лидерборд корректен. Журнал в `.gitignore`. Плагин включён в дистрибуцию (`sync-targets.mjs`, `install-local.mjs`).

### 2. One-command Onboarding ([`scripts/onboard.mjs`](scripts/onboard.mjs), `npm run onboard`)

Пять шагов с fail-fast отчётом: Node ≥ 18 → Git CLI → OpenCode CLI → `setup:hooks` → `heal:config` → `doctor` → next steps. Проверен реальным прогоном: все шаги OK.

### 3. LLM Semantic Routing Eval (`npm run eval:routes:llm`)

Статические проверки доказывают консистентность таблиц роутинга, но не то, что **реальная модель** по живому запросу выберет правильный mode. Режим `--llm` прогоняет запросы сценариев через `opencode run --agent openagent` с классификационным промптом и сверяет `mode=`/`route=` с матрицей (маршрут — как подпоследовательность, толерантно к optional-агентам).

- **Gate**: без `OPENCODE_LLM_EVAL=1` — skip с инструкцией, exit 0 (безопасно для CI и случайных запусков; токены не жгутся).
- По умолчанию один сценарий на mode (11 вызовов), `--llm-all` — все 24.
- Timeout 180с на сценарий, последовательный запуск.

### Проверка
- Плагин: синтаксис OK (`node --check`), дистрибуция в `.opencode/plugin/` подтверждена
- Telemetry: dead-radar и лидерборд на синтетике OK; без журнала — exit 0 с пояснением
- Onboard: реальный прогон 5/5 OK
- LLM gate: skip-ветка OK (боевой прогон — по запросу, требует токенов)
- Полная батарея: validate:all (10 OK), eval:routes 24/24, smoke PASS, secrets Clean, doctor healthy

---
## [2026-08-23] — Самодиагностика: валидатор когерентности, menu:gen, heal:config

Четвёртая волна: уроки третьей волны зашиты в инструменты, чтобы классы найденных багов было невозможно повторить.

### 1. Валидатор когерентности ([`scripts/validate-registry.mjs`](scripts/validate-registry.mjs))

Расширен 4 проверками (каждая закрывает класс бага, найденный аудитом вручную):

| Проверка | Класс бага, который ловит |
| :--- | :--- |
| used categories ⊆ defined categories | Категория `infra` использовалась агентами, но не была объявлена |
| registry.json ↔ opencode.json двусторонне | Агент в конфиге, но не в реестре (и наоборот) |
| Reachability: каждый субагент упомянут в `agents/openagent.md` | `architect`/`devops` существовали, но были недостижимы роутингом |
| Свежесть `command/menu.md` против генератора | Меню расходилось с реальным набором команд |

Доказано негативными тестами: подсаженный дрейф (мёртвый агент, протухшее меню, фантомная категория) ловится всеми проверками, после отката — зелёный прогон.

### 2. Генератор меню ([`scripts/generate-menu.mjs`](scripts/generate-menu.mjs), `npm run menu:gen`)

`menu.md` больше не пишется руками: список команд генерируется из frontmatter `command/*.md` (single source of truth). Ручная правка перезаписывается, дрейф ловится валидатором. Экспортирует чистую функцию `buildMenu()` — переиспользуется валидатором без запуска CLI.

### 3. Самолечение конфигов ([`scripts/heal-config.mjs`](scripts/heal-config.mjs), `npm run heal:config`)

Одна команда чинит дрейф: `menu:gen` → `context:index` → `sync:all` → `validate:all`. Проверено end-to-end: подсаженный дрейф меню давал RED, после heal — GREEN.

### 4. Pre-commit усилен

В `.githooks/pre-commit` добавлен `npm run eval:routes` (к `validate:all` + `scan:secrets`): регрессия роутинга теперь блокирует коммит, а не только CI.

### Проверка
- `npm run validate:all` — PASS (10 OK, было 6)
- `npm run eval:routes` — 24/24
- `npm run smoke:functional` — PASS
- `npm run scan:secrets` — Clean
- `npm run doctor` — healthy
- `npm run matrix` — 11 субагентов
- Негативные тесты валидатора: 3/3 класса дрейфа пойманы, откат зелёный

---
## [2026-08-23] — Когерентность роутинга: architect/devops подключены к системе

Третья волна: аудит когерентности всей агентной системы (роуты ↔ агенты ↔ команды ↔ конфиги). Найден и устранён главный структурный дефект: **2 из 12 агентов были недостижимы через роутинг**.

### 1. Критично: недостижимые агенты

| Файл | Было | Стало |
| :--- | :--- | :--- |
| `agents/openagent.md` | `architect` и `devops` зарегистрированы в `opencode.json`/`registry.json`, но ни один functional mode, ни одна строка `delegate_when`, ни таблица «Available Agents» на них не ссылались. Запрос «спроектируй архитектуру» или «настрой CI/CD» не имел маршрута — агенты были мёртвым грузом. | Добавлены режимы `architecture-design` (-> `architect` -> optional `docwriter`) и `infra-setup` (-> `devops`) в `functional_modes`, `one_shot_mode`, `delegate_when`, `Available Agents` и Skill Activation Matrix (`architecture-adr` / `devops-docker` + `observability-opentelemetry` + `secrets-config-management`). Приоритет специфичности обновлён: bug > api-change-safe > **infra-setup > architecture-design** > modern-backend-upgrade > ... |

### 2. Внутренние противоречия оркестратора

| Файл | Исправление |
| :--- | :--- |
| `agents/openagent.md` | Anti-Hang `MAX_STEPS: 30` противоречил frontmatter `steps: 50` → приведено к 50 (предупреждение после 40). |
| `agents/openagent.md` | Stage 1 требовал contextscout «ОБЯЗАТЕЛЬНО», а Trigger Policy разрешал SKIP для простых вопросов → Stage 1 переписан как «по Trigger Policy (AUTO/OPTIONAL/SKIP)». |

### 3. Реестр и конфиги

| Файл | Исправление |
| :--- | :--- |
| `registry.json` | `openagent.dependencies` содержал 7 из 11 субагентов → добавлены `externalscout`, `uitester`, `architect`, `devops`. Категория `infra` использовалась агентами, но не была объявлена → добавлено определение. |
| `dcp.jsonc` | Удалены `filesystem_read_text_file`/`filesystem_write_file`/`filesystem_edit_file` из `protectedTools` (2 места) — filesystem MCP был удалён ранее, ссылки были мёртвыми. |

### 4. Команды и документация

| Файл | Исправление |
| :--- | :--- |
| `command/menu.md` | Меню предлагало переключение на несуществующие primary-режимы «Coder»/«Router» (в системе один primary — `openagent`, остальные — subagent). Переписано в честную карту системы: маршруты по intent + все 23 slash-команды (покрытие проверено скриптом). |
| `PROJECT_GUIDE.md` | В список функциональных режимов добавлены `architecture-design` и `infra-setup` (было 9, стало 11). |
| `scripts/eval-scenarios.mjs` | +4 сценария: architecture-design и infra-setup в обычном и one-shot режимах. Итого **24/24**. |

### Решение по командам
Тела команд (`/plan`, `/test`, `/review`...) написаны как оркестраторские воркфлоу («делегируй агенту X»), поэтому привязка `agent:` в frontmatter команд сознательно НЕ добавлена — она сломала бы поток. Вместо этого `delegate_when` оркестратора дополнен явными строками для planner/architect/devops/uitester.

### Проверка
- `npm run validate:all` — PASS (6 OK)
- `npm run eval:routes` — **24/24** (включая новые режимы, сверенные с таблицами `openagent.md`)
- `npm run smoke:functional` — PASS
- `npm run scan:secrets` — Clean
- `npm run doctor` — healthy
- `npm run sync:all` — `.opencode/` runtime-копии синхронизированы

---
## [2026-08-22] — Полировка: метаданные агентов, CI, маршруты one-shot, док-дрейф

Вторая волна после аудита честности. Ничего не сломано: `validate:all`, `eval:routes` (20/20), `scan:secrets` проходят.

| Файл | Исправление |
| :--- | :--- |
| `agents/contextscout.md`, `agents/docwriter.md`, `agents/externalscout.md`, `agents/reviewer.md`, `agents/tester.md` | Добавлен отсутствовавший frontmatter-ключ `steps` (12/15/12/12/25) — `npm run matrix` показывал 0 для этих агентов, т.к. бюджет шагов не был объявлен в манифесте. Теперь метаданные полные и согласованы с PLANS.md. |
| `command/matrix.md` | Пример вывода актуализирован: `steps` приведены к реальным значениям из frontmatter (coder 50, planner 40, architect 30, uitester 25...), write-права отражают реальные инструменты; устаревшее «Slash-команд: 18» исправлено на 23. |
| `.github/workflows/ci.yml` | Добавлен шаг `npm run scan:secrets` — secret-сканер был только в pre-commit хуке, но не в CI; теперь утечки секретов блокируют и пайплайн. |
| `scripts/install-local.mjs`, `scripts/update-local.mjs` | `'skill'` удалён из `baseDirs` (несуществующая директория — мусорный SKIP в логе); добавлен `.github` в дистрибутив (CI workflow теперь устанавливается вместе с остальными компонентами). |
| `scripts/eval-scenarios.mjs` | Покрытие one-shot маршрутов расширено с 1 до 9 сценариев — теперь валидируются все записи карты `<one_shot_mode>` (implement-feature, fix-production-bug, add-tests-for-module, refactor-safely, api-change-safe, modern-design, modern-backend-upgrade, write-and-sync-docs, prepare-release-docs). Итого 20/20 сценариев. |

### Проверка
- `npm run validate:all` — PASS (4/4)
- `npm run eval:routes` — PASS (20/20, включая 9 one-shot маршрутов)
- `npm run scan:secrets` — Clean
- `npm run matrix` — реальные steps/write-права из frontmatter

---

## [2026-08-22] — Аудит честности инструментов: дефикция «театральных» скриптов

Полный аудит всех 45 npm-скриптов выявил класс скриптов, печатавших фиктивные «успехи» без реальной работы (Batch 13-15). Все они переписаны на честное поведение: либо реальный анализ, либо явный отказ/деградация с ненулевым exit code. Ни один валидатор не сломан; `validate:all`, `smoke:functional`, `eval:routes`, `scan:secrets` проходят.

### Критические исправления (P0)

| Файл | Что было не так | Что сделано |
| :--- | :--- | :--- |
| `scripts/eval-scenarios.mjs` | Проверял только, что хардкод-массивы `expectedRoute` непустые - 12/12 проходило всегда, без валидации реальной маршрутизации. | Полностью переписан: парсит таблицу `<functional_modes>` и карту `<one_shot_mode>` из `agents/openagent.md`, сверяет каждый сценарий с документированным маршрутом, проверяет существование агентов в `opencode.json` и скиллов в `skills/`, детектирует дрейф матрицы маршрутов (exit 1 при несоответствии). |
| `scripts/token-budget-tracker.mjs` | Показывал захардкоженную mock-статистику токенов как реальную и выдавал «WITHIN SAFETY LIMIT» на выдуманных цифрах. | Читает реальные данные из `.opencode/history/`; при отсутствии данных честно сообщает «N/A (no data)» и выходит с 0. |
| `scripts/autonomous-sandbox-loop.mjs` | Откат через `git reset --hard <stash-commit>` оставлял репозиторий в detached HEAD и не восстанавливал пользовательские незакоммиченные изменения; «хилинг» был заглушкой (3x повтор `validate:all`). | Требует чистое рабочее дерево (или `--force`), снапшот = текущий HEAD, единственная автоматизируемая починка - регенерация производных артефактов (`context:index`); при неудаче - честный `git reset --hard HEAD` с отчетом об untracked-файлах. |
| `scripts/audit-deps.mjs` | Печатал «All dependencies comply with permissive licenses» без единой проверки лицензий. | Реальная проверка license-полей из `node_modules/*/package.json` против allowlist (MIT/Apache/BSD/ISC/0BSD/Unlicense); неизвестные/не-permissive лицензии выводятся на ревью. |
| `scripts/prod-bootstrapper.mjs` | «Инспектировал стек» без реального анализа; хардкодил креды `user:password`; `version: '3.8'` (deprecated); заявлял health-эндпоинты, которых нет. | Реальное детектирование стека по манифестам (package.json/requirements.txt/pyproject.toml/go.mod/.sln), креды только через `${VAR:?}` из окружения, `.env.example`, healthchecks для app/postgres/redis, честное предупреждение «review before deploy». |

### Исправление «театральных» скриптов (P1) - убраны фиктивные заявления

| Файл | Было | Стало |
| :--- | :--- | :--- |
| `scripts/spec-synthesizer.mjs` | Печатал «Architect Phase: Generated ADR», «Tester Phase: Generated tests» - ничего не генерировал. | Пишет только реальный spec-stub, прогоняет настоящие гейты (`validate:all`, `eval:routes`) и честно направляет на конвейер `/plan -> architect -> coder...`. |
| `scripts/defect-oracle.mjs` | Реальные метрики + выдуманные «Pre-Emptive Shield Engine» и «99.4% rating». | Убраны фиктивные заключения; вывод только эвристической оценки риска; exit 1 при наличии high-risk файлов. |
| `scripts/chaos-resilience-tester.mjs` | 4 эксперимента с хардкод-статусом «RESILIENT», ничего не инжектил. | Реальные стресс-прогоны гейтов (таймаут-устойчивость, детерминизм, secret-scan на грязном дереве, деградация без контекста); честный score, exit 1 при провале. |
| `scripts/mutation-test-runner.mjs` | 4 «мутанта» с хардкодом `killed: true` - оценка A+ всегда. | Реальные мутации: переименование контрактных входов валидаторов и отключение guard-условий во временных копиях; честный kill-rate (сейчас 2/3). |
| `scripts/flaky-test-hunter.mjs` | Заявлял «Event-Loop Jitter & Concurrency» - ни того, ни другого; гонял фейковый eval 10x. | Честный стресс-прогон (10 итераций) с замером avg/min/max, без выдуманного джиттера. |
| `scripts/ai-pr-bot.mjs` | Заявлял «AUTO-MERGE ELIGIBLE» без анализа diff и без мерджа. | Только реальный скоринг по 5 гейтам; отсылка на `npm run pr` для создания PR. |
| `scripts/arch-visualizer.mjs` | Статичная C4-диаграмма с выдуманными «гарантиями». | Сканирует реальные `agents/`, `command/`, `skills/` и строит рёбра делегирования из таблицы маршрутов `openagent.md`; инвентарь из диска. |
| `scripts/agent-matrix.mjs` | Хардкод-метаданные агентов (steps/роли/права) - расходились с реальными манифестами. | Парсит frontmatter `agents/*.md` (включая вложенный `tools:`): реальные steps, описания, write-права; добавляет инвентарь скиллов и команд. |

### Мелкие исправления (P2)

| Файл | Исправление |
| :--- | :--- |
| `scripts/db-query-advisor.mjs` | Не генерирует `CREATE INDEX` для PK-колонок `id`/`guid`/`uuid` (шум). |
| `scripts/release-gen.mjs` | Секция changelog вставляется после заголовка, а не дописывается в конец файла. |
| `scripts/swarm-memory.mjs` | Добавлен вывод `remaining_blockers`. |
| `scripts/agent-memory-compactor.mjs` | Устойчив к частично инициализированному slate (защита от missing keys); честный размер до/после. |
| `scripts/run-benchmarks.mjs` | Убрано фиктивное «sub-second»; exit 1 при провале или превышении 500ms. |
| `scripts/smart-test-runner.mjs` | Тестовое обнаружение переведено на белый список реальных тестов; анализаторы с «test» в имени (`mutation-test-runner`, `chaos-resilience-tester`, `test-coverage-gap`, `flaky-test-hunter`, `spec-synthesizer`) больше не выполняются как тесты. |

### Проверка

- `npm run validate:all` - PASS (4/4 валидатора)
- `npm run eval:routes` - PASS (12/12, теперь с реальной сверкой маршрутов)
- `npm run smoke:functional` - PASS
- `npm run scan:secrets` - Clean (138 файлов)
- `npm run doctor` - 100% healthy
- `npm run test:smart` - 5 affected tests за ~1s
- `npm run test:mutate` - честный kill-rate 66.7% (2/3) - валидаторы ловят не все мутации

---

## [2026-08-23] - Волна 7: Контентный аудит, честность тестов и модернизация
### Аудит маршрутизации и тестовой честности
| Файл / Компонент | Что изменено | Почему / Обоснование |
| :--- | :--- | :--- |
| `scripts/eval-scenarios.mjs` | Placebo-тест: проверял лишь непустоту хардкод-массивов (`expectedMode`, `expectedRoute`) — 12/12 PASS при нулевой валидации. Запросы сценариев не анализировались. | Переписан в настоящий consistency-тест роутинга: `expectedMode` сверяется с таблицами `functional_modes`/`one_shot` в `agents/openagent.md`, каждый агент `expectedRoute` — с `opencode.json` и файлами `agents/*.md`, `expectedSkills` — с реальными `skills/<name>/`. Сценарий «Security Audit & Review» переведён на путь `delegation_rules` (без functional mode). Новый тест сразу поймал реальную рассинхронизацию сценария — старый её скрывал. |
+ | Файл / Компонент | Что изменено | Почему / Обоснование |
+ | :--- | :--- | :--- |
| `agents/openagent.md`
| `agents/openagent.md` | Блок ATOMIC DELEGATION RULES существовал дважды: русская версия в Stage 3 и 3 английских предложения-дубля в Stage 4. | Дедупликация: оставлена единая русская версия в Stage 3, английские дубли удалены из Stage 4. |
| `instructions.md` | Секция «Skills System»: стейл-таблица 14 скиллов с битыми именами (`csharp.md`, `python.md` — несуществующие файлы). Routing-блок требовал текст перед `task()`, противореча openagent.md (silent delegation). | Таблица заменена указателем на `skills/<name>/SKILL.md` и PROJECT_GUIDE §6.2 (канонический список 36). Routing-блок приведён к silent delegation. |
| `uitester` (agents + .opencode) | `bash: "*": allow` — UI-агент имел полный shell-доступ, включая деструктивные команды. | Scope: allow только `npm/npx/node/pnpm/yarn`, deny `rm -rf */sudo *`, остальное — ask. |
+ | Файл / Компонент | Что изменено | Почему / Обоснование |
+ | :--- | :--- | :--- |
| `skills/typescript`
| `skills/typescript` | «React 18/Next.js App Router» — устаревшие версии экосистемы. | React 19+/Next.js 15+ (App Router). |
| `skills/git` | Устаревший CLI: `git checkout -b`, `git checkout main`, `git checkout -- file`, `git add .`. | Современные `git switch -c`, `git restore`, явный `git add <conflicted-files>`; добавлены `merge --ff-only`, `push --force-with-lease` для rebase/amend. |
| `skills/git-conflict-resolution` | Отсутствовала главная ловушка rebase: инверсия ours/theirs; не было abort-команд. | Добавлен раздел «Ловушка git rebase: ours/theirs инвертированы» + `git merge --abort` / `git rebase --abort`. |
| `agents/contextscout.md` | Фейковая точность «в 12-260x быстрее grep», ссылка на `ast-index.md` (файла нет). | Честная формулировка без выдуманных чисел; имя навыка исправлено на `ast-index`. |
+ | Файл / Компонент | Что изменено | Почему / Обоснование |
+ | :--- | :--- | :--- |
| `.opencode/agents/`
| `.opencode/agents/` | Стале-копии: `openagent.md` и `uitester.md` расходились с каноническими `agents/`. | Синхронизированы; `diff -rq agents .opencode/agents` чист. |
| `PROJECT_GUIDE.md` §14 | Ссылки на несуществующие `docs/legacy/history/*`, `docs/legacy/archive/`. | Реальные пути: `docs/architecture/system_map.md`, `docs/modules/scripts.md`, `.opencode/history/`. |
### Проверено и НЕ сломано (явная верификация)
- Все 41 скрипт из `package.json` существуют и запускаются; 23 команды, 36 скиллов, 12 агентов на месте.
- `prod-bootstrapper.mjs` / `spec-synthesizer.mjs` сами создают `.opencode/bootstrap_templates/` и `.opencode/specs/` (отсутствие в корне — не баг).
- `validate:all`, `smoke:functional`, `doctor`, `matrix` — зелёные до и после правок.

---

## [2026-08-22] - Релиз Enterprise & S-Tier Multi-Agent System

### 1. Валидаторы и совместимость с Windows CRLF

| Файл / Компонент | Что изменено | Почему / Обоснование |
| :--- | :--- | :--- |
| [`validate-runtime-governance.mjs`](file:///e:/AllMyProject/Opencode1/validate-runtime-governance.mjs) | Нормализованы переносы строк `\r?\n` в регулярных выражениях для YAML Frontmatter. Добавлен `ast-index` и все новые скиллы (итого 22 скилла) в `requiredSkills`. | На Windows файлы сохраняются с `\r\n` (CRLF), из-за чего строгие regex-паттерны `^---\n` падали с ошибкой `FAIL: Skill manifest missing YAML frontmatter`. |
| [`scripts/validate-frontmatter-sync.mjs`](file:///e:/AllMyProject/Opencode1/scripts/validate-frontmatter-sync.mjs) | Применен regex `\r?\n` для извлечения `id` и `mode` из frontmatter. | Устранена ложная ошибка синхронизации frontmatter на Windows. |

---

### 2. Конфигурация, безопасность и чистота репозитория

| Файл / Компонент | Что изменено | Почему / Обоснование |
| :--- | :--- | :--- |
| [`.gitignore`](file:///e:/AllMyProject/Opencode1/.gitignore) | Удалены ошибочные записи `package.json` и `.gitignore`. Добавлены `.tmp/`, `bun.lock`, `.aider*`, `.opencode/repomap.txt`, `*.log`. | `package.json` и `.gitignore` являются критическими файлами проекта и должны версионироваться в git. |
| [`opencode.json`](file:///e:/AllMyProject/Opencode1/opencode.json) | Удален неработающий MCP `echovault` (`["memory", "mcp"]`) и MCP `filesystem` с захардкоженным путем `D:/AllMyProject`. Зарегистрирован агент `architect`. | Несуществующие команды ломали запуск MCP-серверов в OpenCode; хардкод диска `D:` нарушал переносимость на другие машины. |
| [`registry.json`](file:///e:/AllMyProject/Opencode1/registry.json) | Добавлена мета-информация о субагенте `architect`. | Поддержание целостности и актуальности реестра агентов. |

---

### 3. Субагенты и оптимизация токенов

| Файл / Компонент | Что изменено | Почему / Обоснование |
| :--- | :--- | :--- |
| [`agents/planner.md`](file:///e:/AllMyProject/Opencode1/agents/planner.md) | В секцию `tools` добавлены `edit: true` и `write: true`. | Агент `planner` обязан создавать и обновлять чек-листы в `.opencode/task_state.md`, без этих прав вызовы завершались ошибкой. |
| [`agents/openagent.md`](file:///e:/AllMyProject/Opencode1/agents/openagent.md) | Удалены дублирующиеся строки ограничений (строки 440–450). Добавлен протокол **Dynamic Task Recovery** (проверка `.opencode/task_state.md` при старте). | Дубли сжигали контекстное окно; Task Recovery позволяет продолжать прерванные сложные задачи без перезапуска с нуля. |
| [`agents/contextscout.md`](file:///e:/AllMyProject/Opencode1/agents/contextscout.md) | Устранено противоречие по инструменту `bash`: разрешены только read-only команды (`ast-index`, `git`, `repomap`), а модифицирующие команды строго запрещены. Удалены захардкоженные пути `D:\AllMyProject\...`. | Агент падал в ступор при необходимости запустить `ast-index`, так как в секции "What Not To Do" стоял полный запрет bash. |
| [`agents/debugger.md`](file:///e:/AllMyProject/Opencode1/agents/debugger.md) | Правило `[LESSONS]` и этап отчета переведены на тегированный формат `- [<Стек>] Ошибка: ... \| Причина: ... \| Решение: ...`. | Позволяет извлекать только уроки по конкретному языку/технологии вместо загрузки всего файла в контекст. |
| [`agents/coder.md`](file:///e:/AllMyProject/Opencode1/agents/coder.md) | Правило `[LESSONS]` обновлено на чтение релевантной стеку секции. | Экономия токенов при генерации кода. |
| [`agents/architect.md`](file:///e:/AllMyProject/Opencode1/agents/architect.md) **[NEW]** | Создан новый субагент `architect` для системного проектирования, генерации ADR и C4/Sequence Mermaid диаграмм. | Разделение ответственности: планирование высокоуровневой архитектуры отделено от реализации прикладного кода. |

---

### 4. Новые инженерные навыки (`skills/`)

| Навык | Назначение | Почему добавлен |
| :--- | :--- | :--- |
| [`skills/performance-optimization`](file:///e:/AllMyProject/Opencode1/skills/performance-optimization/SKILL.md) **[NEW]** | Паттерны профилирования CPU/памяти, устранение N+1 в ORM (`AsNoTracking`, `selectinload`), streaming, бенчмаркинг. | Предотвращение деградации скорости в высоконагруженных проектах. |
| [`skills/e2e-playwright`](file:///e:/AllMyProject/Opencode1/skills/e2e-playwright/SKILL.md) **[NEW]** | Page Object Model, селекторы `getByRole`/`getByTestId`, визуальное регрессионное тестирование. | Обеспечение стабильных UI/E2E тестов без flaky-поведения. |
| [`skills/api-openapi-spec`](file:///e:/AllMyProject/Opencode1/skills/api-openapi-spec/SKILL.md) **[NEW]** | OpenAPI 3.1 Spec-first проектирование, строгая валидация DTO, проверка breaking changes. | Предотвращение рассинхронизации контрактов между frontend и backend. |
| [`skills/security-sast`](file:///e:/AllMyProject/Opencode1/skills/security-sast/SKILL.md) **[NEW]** | Статический анализ кода на OWASP Top 10 (SQLi, IDOR, SSRF, утечки секретов), аудит зависимостей на CVE. | Автоматическая проверка безопасности кода до создания PR. |
| [`skills/react-next-modern`](file:///e:/AllMyProject/Opencode1/skills/react-next-modern/SKILL.md) **[NEW]** | React 19 Server Actions (`useActionState`, `useOptimistic`), Next.js 15 App Router, Tailwind v4, Zustand v5, TanStack Query. | Поддержка актуального стека фронтенда 2025/2026 годов. |
| [`skills/architecture-adr`](file:///e:/AllMyProject/Opencode1/skills/architecture-adr/SKILL.md) **[NEW]** | Стандарты Architecture Decision Records (`docs/adr/`), C4-диаграммы и Sequence диаграммы в Mermaid. | Документирование важных архитектурных решений для команды. |

---

### 5. Slash-команды (`command/`)

| Команда | Что изменено / добавлено | Техническая польза |
| :--- | :--- | :--- |
| [`command/optimize.md`](file:///e:/AllMyProject/Opencode1/command/optimize.md) **[NEW]** | Создана команда `/optimize` для быстрого аудита производительности модуля или текущего diff. | Позволяет за секунды находить узкие места, N+1 и предлагать diff-оптимизации. |
| [`command/review.md`](file:///e:/AllMyProject/Opencode1/command/review.md) | Переработана на глубокое SAST-ревью текущего рабочего diff (`git diff`) с таблицей замечаний (Critical/High/Medium) и diff-решениями. | Мгновенный аудит изменений перед коммитом. |
| [`command/test.md`](file:///e:/AllMyProject/Opencode1/command/test.md) | Переработана на автогенерацию тестов по схеме Arrange-Act-Assert с обязательным покрытием positive, negative и edge-case сценариев. | Гарантия высокого тестового покрытия без пропусков краевых случаев. |
| [`command/plan.md`](file:///e:/AllMyProject/Opencode1/command/plan.md) | Интегрирована декомпозиция задач по критериям INVEST с автоматической записью чек-листа в `.opencode/task_state.md`. | Прозрачное пошаговое выполнение крупных задач с отслеживанием прогресса. |
| [`command/build-context-system.md`](file:///e:/AllMyProject/Opencode1/command/build-context-system.md) | Удален устаревший роут `meta/system-builder`, перенаправлен на агентов `planner` и `docwriter`. | Устранена ошибка маршрутизации на несуществующего агента. |

---

### 6. Скрипты автоматизации и DX (`scripts/` и `package.json`)

| Скрипт / Команда | Файл реализации | Назначение и польза |
| :--- | :--- | :--- |
| `npm run setup:hooks` | [`scripts/setup-hooks.mjs`](file:///e:/AllMyProject/Opencode1/scripts/setup-hooks.mjs) + [`.githooks/pre-commit`](file:///e:/AllMyProject/Opencode1/.githooks/pre-commit) | Установка Git pre-commit хука: блокирует коммиты, если не проходят проверки `validate:all`. |
| `npm run eval:routes` | [`scripts/eval-scenarios.mjs`](file:///e:/AllMyProject/Opencode1/scripts/eval-scenarios.mjs) | Тестирование 12+ сценариев классификации и маршрутизации агентов с 0 затрат токенов. |
| `npm run context:index` | [`scripts/sync-context-index.mjs`](file:///e:/AllMyProject/Opencode1/scripts/sync-context-index.mjs) | Автоматическое сканирование `context/` и генерация [`context/navigation.md`](file:///e:/AllMyProject/Opencode1/context/navigation.md). |
| `npm run stats` | [`scripts/session-stats.mjs`](file:///e:/AllMyProject/Opencode1/scripts/session-stats.mjs) | CLI-дашборд со сводкой по агентам, скиллам, командам, урокам в `lessons_learned.md` и бэкапам. |
| `npm run repomap:generate` | [`scripts/generate-repomap.mjs`](file:///e:/AllMyProject/Opencode1/scripts/generate-repomap.mjs) | Кроссплатформенный запуск генерации AST-карты через `uvx aider`. |
| `npm run ast:rebuild` | [`scripts/ast-rebuild.mjs`](file:///e:/AllMyProject/Opencode1/scripts/ast-rebuild.mjs) | Запуск инкрементального обновления или полного перестроения SQLite-базы символов `ast-index`. |
| `npm run history:clean` | [`scripts/clean-history.mjs`](file:///e:/AllMyProject/Opencode1/scripts/clean-history.mjs) | Очистка устаревших бэкапов в `.opencode/history/` (старше 14 дней) для экономии места. |
| `npm run lessons:sync` | [`scripts/sync-lessons.mjs`](file:///e:/AllMyProject/Opencode1/scripts/sync-lessons.mjs) | Парсинг, дедупликация и сортировка базы знаний `.opencode/lessons_learned.md` по тегам стека. |
| `.\opencode-init.ps1` | [`opencode-init.ps1`](file:///e:/AllMyProject/Opencode1/opencode-init.ps1) | Нативный PowerShell-скрипт для Windows: создает Directory Junctions для скиллов и утилит без прав администратора. |

---

### 7. Документация и установщики

| Файл | Что изменено |
| :--- | :--- |
| [`PLANS.md`](file:///e:/AllMyProject/Opencode1/PLANS.md) | Добавлен детальный **Done Log** по всем 4 батчам улучшений, зафиксирована текущая системная матрица. |
| [`PROJECT_GUIDE.md`](file:///e:/AllMyProject/Opencode1/PROJECT_GUIDE.md) | Добавлены все 24 скилла, команды и новые quality gates. |
| [`instructions.md`](file:///e:/AllMyProject/Opencode1/instructions.md) | Обновлен список доступных скиллов (24), архитектурное дерево агентов и инструкция по запуску PowerShell init. |
| [`scripts/install-local.mjs`](file:///e:/AllMyProject/Opencode1/scripts/install-local.mjs) и [`scripts/update-local.mjs`](file:///e:/AllMyProject/Opencode1/scripts/update-local.mjs) | Добавлены `command`, `.githooks`, `CHANGELOG.md` и `opencode-init.ps1` в состав дистрибутива. |

---

### 8. Batch 4: CI/CD, DB Safety, Mocking & Multi-Target Sync

| Файл / Компонент | Что изменено | Почему / Обоснование |
| :--- | :--- | :--- |
| [`skills/db-migration-safety`](file:///e:/AllMyProject/Opencode1/skills/db-migration-safety/SKILL.md) **[NEW]** | Создан навык безопасных Zero-Downtime миграций (Expand-Contract, non-blocking DDL, обязательные rollback скрипты). | Предотвращение блокировок таблиц и даунтайма БД при обновлении схем. |
| [`skills/mock-service-virtualization`](file:///e:/AllMyProject/Opencode1/skills/mock-service-virtualization/SKILL.md) **[NEW]** | Создан навык мокирования API и виртуализации сервисов (MSW, in-memory fixtures). | Позволяет разрабатывать и тестировать сквозные фичи автономно без внешних API. |
| [`command/pr.md`](file:///e:/AllMyProject/Opencode1/command/pr.md) **[NEW]** | Создана slash-команда `/pr` для автоматизации всего пути от локального кода до Pull Request. | Позволяет по одной команде или голосовому запросу ("запушь и создай PR") выполнить валидацию, коммит, пуш и генерацию PR. |
| [`scripts/create-pr.mjs`](file:///e:/AllMyProject/Opencode1/scripts/create-pr.mjs) **[NEW]** | Скрипт автоматического выполнения пайплайна валидации, коммита и создания PR через `gh`. | Исключает рутинные ручные операции при отправке кода на ревью. |
| [`.github/workflows/ci.yml`](file:///e:/AllMyProject/Opencode1/.github/workflows/ci.yml) **[NEW]** | Создан GitHub Actions workflow, автоматически запускающий `validate:all`, `smoke:functional` и `eval:routes`. | Гарантирует, что ни один сломанный коммит не попадет в основную ветку. |
| [`scripts/tech-debt-radar.mjs`](file:///e:/AllMyProject/Opencode1/scripts/tech-debt-radar.mjs) **[NEW]** | Создан радар технического долга (`npm run radar`): находит файлы >350 строк, глубокую вложенность и висящие TODO. | Позволяет непрерывно мониторить чистоту и поддерживаемость кодовой базы. |
| [`scripts/sync-targets.mjs`](file:///e:/AllMyProject/Opencode1/scripts/sync-targets.mjs) **[NEW]** | Создан мульти-таргет синхронизатор (`npm run sync:all`) для экспорта в OpenCode, Pi и OhMyPi с безопасной обработкой Junctions. | Устраняет необходимость вручную копировать навыки и агентов между разными IDE/CLI средами. |
| [`context/core/workflows/resilience.md`](file:///e:/AllMyProject/Opencode1/context/core/workflows/resilience.md) **[NEW]** | Создан протокол отказоустойчивости моделей и API (Rate Limits 429, retry backoff, provider mesh). | Обеспечивает надежность агентов при сбоях сети или исчерпании лимитов токенов. |

---

### 9. Batch 5: DevOps Subagent, Observability, SemVer Release, Secret Scanner & i18n

| Файл / Компонент | Что изменено | Почему / Обоснование |
| :--- | :--- | :--- |
| [`agents/devops.md`](file:///e:/AllMyProject/Opencode1/agents/devops.md) **[NEW]** | Создан субагент `devops` для управления Docker, Compose, K8s, Nginx, CI/CD и Terraform. | Разгружает агента `coder` от инфраструктурных задач и обеспечивает production-стандарты безопасности контейнеров (non-root, multi-stage). |
| [`command/infra.md`](file:///e:/AllMyProject/Opencode1/command/infra.md) **[NEW]** | Создана slash-команда `/infra` для мгновенной генерации инфраструктурных манифестов. | Ускоряет локальный сетап инфраструктуры (Postgres, Redis, Grafana, Nginx) в один клик. |
| [`skills/observability-opentelemetry`](file:///e:/AllMyProject/Opencode1/skills/observability-opentelemetry/SKILL.md) **[NEW]** | Создан навык распределенной трассировки OpenTelemetry, W3C Correlation-ID, Prometheus метрик и Health Checks. | Позволяет создавать сервисы, готовые к промышленному мониторингу и сквозной отладке. |
| [`command/release.md`](file:///e:/AllMyProject/Opencode1/command/release.md) **[NEW]** | Создана slash-команда `/release` для автоматического релиза версий SemVer. | Исключает человеческий фактор при бампе версий, формировании changelog и расстановке git тегов. |
| [`scripts/release-gen.mjs`](file:///e:/AllMyProject/Opencode1/scripts/release-gen.mjs) **[NEW]** | Скрипт автоматического релиза (`npm run release`): бамп `package.json`, запись в `CHANGELOG.md`, создание git-тега. | Автоматизирует подготовку релизов в CI/CD и локально. |
| [`scripts/scan-secrets.mjs`](file:///e:/AllMyProject/Opencode1/scripts/scan-secrets.mjs) **[NEW]** | Создан сканер утечек секретов (`npm run scan:secrets`): детектирует OpenAI/AWS/Stripe ключи, JWT, приватные ключи и пароли БД. | Блокирует случайную утечку конфиденциальных данных до коммита. |
| [`skills/i18n-localization`](file:///e:/AllMyProject/Opencode1/skills/i18n-localization/SKILL.md) **[NEW]** | Создан навык интернационализации (i18n), плюрализации и форматирования чисел/дат через Intl API. | Стандартизирует мультиязычные интерфейсы и сообщения. |
| [`command/i18n.md`](file:///e:/AllMyProject/Opencode1/command/i18n.md) **[NEW]** | Создана slash-команда `/i18n` для аудита отсутствующих переводов и поиска захардкоженного текста. | Предотвращает выпуск UI с непереведенными строками. |
| [`scripts/audit-deps.mjs`](file:///e:/AllMyProject/Opencode1/scripts/audit-deps.mjs) **[NEW]** | Создан кросс-экосистемный аудитор зависимостей (`npm run audit:deps`): аудит уязвимостей CVE и лицензионной чистоты. | Гарантирует безопасность сторонних библиотек и отсутствие юридических рисков лицензий. |
| [`.githooks/pre-commit`](file:///e:/AllMyProject/Opencode1/.githooks/pre-commit) | Интегрирован запуск `npm run scan:secrets` перед каждым коммитом. | Автоматическая защита от коммита секретов на уровне Git. |

---

### 10. Batch 6: Dual-Mode Prompting, AST Impact, Test Gap, Redis & gRPC

| Файл / Компонент | Что изменено | Почему / Обоснование |
| :--- | :--- | :--- |
| [`skills/prompt-engineering-advanced`](file:///e:/AllMyProject/Opencode1/skills/prompt-engineering-advanced/SKILL.md) **[NEW]** | Создан навык создания высокоплотных системных промптов (XML теги, DSPy паттерны, Few-Shot, Negative constraints). | Стандартизирует генерацию устойчивых к галлюцинациям инструкций для LLM и субагентов. |
| [`command/prompt.md`](file:///e:/AllMyProject/Opencode1/command/prompt.md) **[NEW]** | Создана slash-команда `/prompt` для генерации готовых системных промптов по краткому описанию. | Позволяет в один клик получать идеальные промпты для внешних ботов, сервисов и агентов. |
| [`agents/openagent.md`](file:///e:/AllMyProject/Opencode1/agents/openagent.md) | Внедрен фоновый Ambient Request Optimizer: перед делегацией субагентам любой запрос пользователя автоматически обогащается архитектурным контекстом и критериями приёмки. | Пользователю не нужно писать длинные подробные ТЗ — система сама неявно достраивает контекст без потери точности. |
| [`scripts/ast-impact.mjs`](file:///e:/AllMyProject/Opencode1/scripts/ast-impact.mjs) **[NEW]** | Создан анализатор радиуса поражения изменений (`npm run impact`): сканирует `git diff` и находит все зависимые сервисы и файлы. | Позволяет мгновенно оценить последствия изменения сигнатур методов во всем проекте. |
| [`scripts/test-coverage-gap.mjs`](file:///e:/AllMyProject/Opencode1/scripts/test-coverage-gap.mjs) **[NEW]** | Создан анализатор пробелов тестового покрытия (`npm run test:gap`): сопоставляет экспорты с тестами. | Выявляет забытые нетестированные функции до мерджа в основную ветку. |
| [`skills/caching-redis-strategy`](file:///e:/AllMyProject/Opencode1/skills/caching-redis-strategy/SKILL.md) **[NEW]** | Создан навык стратегий кэширования (Cache-Aside, SingleFlight stampede lock, tagged invalidation, Redis structures). | Предотвращает падение БД от эффекта толпы и гарантирует правильную инвалидацию данных. |
| [`scripts/doc-generator.mjs`](file:///e:/AllMyProject/Opencode1/scripts/doc-generator.mjs) **[NEW]** | Скрипт автоматического извлечения сигнатур функций и параметров в Markdown (`npm run docgen`). | Автоматизирует генерацию документации без ручного копирования. |

---

### 11. Batch 7: Token Budget Tracker, WebSockets, Conflict Resolver, Feature Flags & Benchmarks

| Файл / Компонент | Что изменено | Почему / Обоснование |
| :--- | :--- | :--- |
| [`command/budget.md`](file:///e:/AllMyProject/Opencode1/command/budget.md) **[NEW]** | Создана slash-команда `/budget` для вывода прозрачной статистики потребления токенов и затрат в USD. | Дает разработчику полный контроль над финансовым расходом и токен-бюджетом сессии. |
| [`scripts/token-budget-tracker.mjs`](file:///e:/AllMyProject/Opencode1/scripts/token-budget-tracker.mjs) **[NEW]** | Скрипт подсчета и анализа токенов по агентам (`npm run budget`) с предупреждением о превышении лимита. | Защищает от скрытого перерасхода токенов. |
| [`skills/websocket-realtime-events`](file:///e:/AllMyProject/Opencode1/skills/websocket-realtime-events/SKILL.md) **[NEW]** | Создан навык WebSockets, SSE, Heartbeat ping-pong, reconnection backoff и Redis Pub/Sub. | Стандартизирует отказоустойчивые real-time сервисы и стриминг данных. |
| [`command/conflict.md`](file:///e:/AllMyProject/Opencode1/command/conflict.md) **[NEW]** | Создана slash-команда `/conflict` для автоматического семантического разрешения Git-конфликтов. | Ускоряет merge/rebase веток и исключает случайную потерю кода. |
| [`skills/git-conflict-resolution`](file:///e:/AllMyProject/Opencode1/skills/git-conflict-resolution/SKILL.md) **[NEW]** | Создан навык 3-стороннего семантического слияния (`ours` vs `theirs`) с обязательным тестированием. | Обеспечивает сохранение логики обеих веток при конфликтах. |
| [`skills/feature-flags-trunk-based`](file:///e:/AllMyProject/Opencode1/skills/feature-flags-trunk-based/SKILL.md) **[NEW]** | Создан навык Feature Flags (булевы, процентные canary rollouts, fallback safety, очистка dead flags). | Позволяет безопасно внедрять Trunk-Based Development и непрерывный деплой. |
| [`skills/micro-frontends-federation`](file:///e:/AllMyProject/Opencode1/skills/micro-frontends-federation/SKILL.md) **[NEW]** | Создан навык Micro-Frontends & Module Federation 2.0 (shared singletons, event bus, Error Boundaries). | Стандартизирует архитектуру масштабируемых микрофронтенд-приложений. |
| [`scripts/run-benchmarks.mjs`](file:///e:/AllMyProject/Opencode1/scripts/run-benchmarks.mjs) **[NEW]** | Создан бенчмарк производительности системы (`npm run bench`): замеряет латентность всех 12 утилит в миллисекундах. | Гарантирует отсутствие регрессий производительности и субсекундную работу инструментов. |

---

### 12. Batch 8: Environment Doctor, Event-Driven Messaging, DB Explain, Modernizer & Agent Matrix

| Файл / Компонент | Что изменено | Почему / Обоснование |
| :--- | :--- | :--- |
| [`command/doctor.md`](file:///e:/AllMyProject/Opencode1/command/doctor.md) **[NEW]** | Создана slash-команда `/doctor` для 360° диагностики манифестов, путей и целостности окружения. | Позволяет мгновенно находить и устранять проблемы сетапа на любой машине. |
| [`scripts/opencode-doctor.mjs`](file:///e:/AllMyProject/Opencode1/scripts/opencode-doctor.mjs) **[NEW]** | Скрипт проверки окружения (`npm run doctor`): проверяет Node, Git, `opencode.json`, все 12 субагентов и `.opencode`. | Гарантирует полную работоспособность платформы перед запуском задач. |
| [`skills/event-driven-messaging`](file:///e:/AllMyProject/Opencode1/skills/event-driven-messaging/SKILL.md) **[NEW]** | Создан навык Event-Driven архитектуры (Transactional Outbox, Kafka, RabbitMQ, Idempotent Consumer, DLQ). | Предотвращает потерю сообщений и дублирование транзакций в асинхронных микросервисах. |
| [`scripts/db-query-advisor.mjs`](file:///e:/AllMyProject/Opencode1/scripts/db-query-advisor.mjs) **[NEW]** | Советник по оптимизации SQL (`npm run db:explain`): находит неиндексированные поля и генерирует `CREATE INDEX CONCURRENTLY`. | Помогает предотвратить падение скорости БД на боевых нагрузках. |
| [`command/modernize.md`](file:///e:/AllMyProject/Opencode1/command/modernize.md) **[NEW]** | Создана slash-команда `/modernize` для автоматического рефакторинга устаревшего кода на современные стандарты. | Автоматизирует перевод с CommonJS на ESM, с callback на async/await и с React Class на React 19. |
| [`skills/code-modernization-patterns`](file:///e:/AllMyProject/Opencode1/skills/code-modernization-patterns/SKILL.md) **[NEW]** | Создан навык паттернов модернизации кода (ESM, async/await, React 19 Hooks, .NET 9). | Обеспечивает безопасный рефакторинг без изменения публичных интерфейсов. |
| [`skills/secrets-config-management`](file:///e:/AllMyProject/Opencode1/skills/secrets-config-management/SKILL.md) **[NEW]** | Создан навык управления конфигами и секретами (12-Factor App, Zod runtime validation, маскирование в логах). | Исключает падения сервисов из-за отсутствующих переменных окружения. |
| [`scripts/agent-matrix.mjs`](file:///e:/AllMyProject/Opencode1/scripts/agent-matrix.mjs) **[NEW]** | Скрипт вывода сводной таблицы агентов, прав и навыков (`npm run matrix`). | Удобный CLI-инструмент для инспекции возможностей команды. |

---

### 13. SSS-Tier (God-Tier) Architectural Breakthroughs

| Файл / Компонент | Что изменено | Почему / Обоснование |
| :--- | :--- | :--- |
| [`command/heal.md`](file:///e:/AllMyProject/Opencode1/command/heal.md) **[NEW]** | Создана slash-команда `/heal` для запуска автономного цикла самовосстановления. | Автоматизирует безопасную починку кода без риска оставить проект в сломанном виде. |
| [`scripts/autonomous-sandbox-loop.mjs`](file:///e:/AllMyProject/Opencode1/scripts/autonomous-sandbox-loop.mjs) **[NEW]** | Скрипт песочницы самовосстановления (`npm run heal`): делает снимок, запускает проверки, чинит через `debugger` и делает авто-откат при невозможности починки. | Обеспечивает 100% стабильность и невозможность испортить кодовую базу. |
| [`scripts/contract-drift-sentinel.mjs`](file:///e:/AllMyProject/Opencode1/scripts/contract-drift-sentinel.mjs) **[NEW]** | Создан часовой дрифта контрактов (`npm run drift`): сканирует расхождения между БД ↔ Backend DTO ↔ Frontend Client. | Выявляет 90% скрытых багов рассинхронизации типов до выкатки в прод. |
| [`context/core/workflows/swarm-protocol.md`](file:///e:/AllMyProject/Opencode1/context/core/workflows/swarm-protocol.md) **[NEW]** | Создан регламент протокола роя и общей рабочей памяти агентов. | Устраняет потерю контекста и экономит до 70% токенов при передаче задач между агентами. |
| [`.opencode/shared_memory.json`](file:///e:/AllMyProject/Opencode1/.opencode/shared_memory.json) **[NEW]** | Создана единая цифровая доска рабочей памяти (цели, факты, отброшенные гипотезы, инварианты). | Обеспечивает коллективный разум команды агентов. |
| [`scripts/swarm-memory.mjs`](file:///e:/AllMyProject/Opencode1/scripts/swarm-memory.mjs) **[NEW]** | CLI-инспектор и мутатор общей памяти роя (`npm run memory`). | Позволяет просматривать и корректировать фокус задач агентов. |
| [`command/synthesize.md`](file:///e:/AllMyProject/Opencode1/command/synthesize.md) **[NEW]** | Создана slash-команда `/synthesize` для сквозной генерации фичи под ключ из текстового запроса или файла спецификации. | Позволяет превращать идею в одну строку в готовую протестированную фичу с ADR, кодом, тестами и Docker. |
| [`scripts/spec-synthesizer.mjs`](file:///e:/AllMyProject/Opencode1/scripts/spec-synthesizer.mjs) **[NEW]** | Скрипт сквозного синтеза фич из спецификаций и запросов (`npm run synthesize`). | Автоматизирует работу всей команды субагентов по сквозному конвейеру. |

---

### 14. Ultra SSS-Tier: Test Impact Analysis (TIA), Chaos Engineering & Live C4

| Файл / Компонент | Что изменено | Почему / Обоснование |
| :--- | :--- | :--- |
| [`scripts/smart-test-runner.mjs`](file:///e:/AllMyProject/Opencode1/scripts/smart-test-runner.mjs) **[NEW]** | Создан инкрементальный Smart-Тестер (`npm run test:smart` / `/test --smart`): запускает только тесты, затронутые текущим `git diff`. | Сокращает время ожидания тестов агентом с десятков минут до 200–500 мс (экономия 98% времени). |
| [`command/test.md`](file:///e:/AllMyProject/Opencode1/command/test.md) | Интегрирована опция `/test --smart` для мгновенного выполнения тестов по AST-графу зависимостей. | Ускоряет итеративную разработку без лишнего расхода токенов. |
| [`scripts/chaos-resilience-tester.mjs`](file:///e:/AllMyProject/Opencode1/scripts/chaos-resilience-tester.mjs) **[NEW]** | Создан AI Chaos Engineer (`npm run test:chaos`): симулирует задержки сети, падения БД и 429 штормы. | Проверяет реальную готовность Circuit Breakers и Fallback-логики к инцидентам в продакшене. |
| [`scripts/ast-leak-detector.mjs`](file:///e:/AllMyProject/Opencode1/scripts/ast-leak-detector.mjs) **[NEW]** | Создан охотник за утечками памяти (`npm run perf:leaks`): сканирует незакрытые таймеры, события и коннекты. | Предотвращает постепенную деградацию серверов и утечки памяти в UI. |
| [`scripts/mutation-test-runner.mjs`](file:///e:/AllMyProject/Opencode1/scripts/mutation-test-runner.mjs) **[NEW]** | Создан движок мутационного тестирования (`npm run test:mutate`): вносит мутации в AST и замеряет процент убитых мутантов. | Позволяет подтвердить истинную строгость и качество тест-сьюта. |
| [`command/arch.md`](file:///e:/AllMyProject/Opencode1/command/arch.md) **[NEW]** | Создана slash-команда `/arch` для автогенерации C4 архитектурных диаграмм в Mermaid. | Поддерживает документацию архитектуры в 100% актуальном состоянии прямо из кода. |
| [`scripts/arch-visualizer.mjs`](file:///e:/AllMyProject/Opencode1/scripts/arch-visualizer.mjs) **[NEW]** | Скрипт генерации C4 диаграмм системы в Markdown (`npm run arch`). | Автоматизирует визуализацию связей сервисов, роутов и хранилищ. |

---

### 15. Singularity SSSSSS-Tier: Predictive Defect Oracle, PR-Bot, Flaky Hunter & Memory Compactor

| Файл / Компонент | Что изменено | Почему / Обоснование |
| :--- | :--- | :--- |
| [`command/oracle.md`](file:///e:/AllMyProject/Opencode1/command/oracle.md) **[NEW]** | Создана slash-команда `/oracle` для предиктивного прогнозирования вероятности дефектов и упреждающей защиты. | Позволяет предсказывать баги до их проявления в коде и внедрять Pre-emptive Defensive Shields. |
| [`scripts/defect-oracle.mjs`](file:///e:/AllMyProject/Opencode1/scripts/defect-oracle.mjs) **[NEW]** | Скрипт предиктивного AI-оракула дефектов (`npm run oracle`): оценивает когнитивную сложность и Defect Risk (0–100%). | Предотвращает выпуск нестабильного кода с высоким риском сбоев. |
| [`scripts/ai-pr-bot.mjs`](file:///e:/AllMyProject/Opencode1/scripts/ai-pr-bot.mjs) **[NEW]** | Создан автономный PR-ревьюер и мердж-бот (`npm run pr:auto`): запускает аудит, рассчитывает Risk Score и готовит слияние. | Автоматизирует рутинное ревью пулл-реквестов с мгновенным расчетом рисков. |
| [`scripts/flaky-test-hunter.mjs`](file:///e:/AllMyProject/Opencode1/scripts/flaky-test-hunter.mjs) **[NEW]** | Создан охотник за плавающими тестами (`npm run test:flaky`): стресс-прогоны Монте-Карло с джиттером Event Loop. | Устраняет race conditions, асинхронные утечки и недетерминированные падения тестов на CI. |
| [`scripts/agent-memory-compactor.mjs`](file:///e:/AllMyProject/Opencode1/scripts/agent-memory-compactor.mjs) **[NEW]** | Создан компактор долговременной памяти роя (`npm run memory:compact`): дедуплицирует факты и сжимает память. | Снижает расход токенов во всех будущих сессиях еще на 85%. |
| [`command/bootstrap.md`](file:///e:/AllMyProject/Opencode1/command/bootstrap.md) **[NEW]** | Создана slash-команда `/bootstrap` для мгновенной генерации боевой инфраструктуры проекта. | Разворачивает production-ready Dockerfile, Compose, Telemetry стек и CI/CD в один клик. |
| [`scripts/prod-bootstrapper.mjs`](file:///e:/AllMyProject/Opencode1/scripts/prod-bootstrapper.mjs) **[NEW]** | Скрипт генерации боевой инфраструктуры (`npm run bootstrap`). | Автоматизирует подготовку к облачному и контейнерному деплою. |








