# OpenCode Global Instructions

## Environment (Windows + PowerShell)

- OS: Windows
- Shell: PowerShell (prefer pwsh 7+, fallback Windows PowerShell 5.1)
- Paths: Windows-style (`C:\path\to\file`), quote paths with spaces

### PowerShell Syntax
```powershell
# Environment variables
$env:NAME = "value"

# Chain commands (use ; not &&)
command1 ; command2

# Check exit code
$LASTEXITCODE

# Common equivalents
Get-ChildItem      # ls
Get-Content        # cat
Remove-Item -Recurse -Force  # rm -rf
```

---

## Anti-Hang Protocol (CRITICAL)

<anti_hang enforcement="absolute">
  1. MAX_STEPS: Соблюдай лимиты (50 для main agent, 25-50 для subagents). Экономь steps: не делай лишних read/grep между делегациями.
  2. NO BLOCKING: Используй `question` tool вместо блокирующего ожидания
  3. SUBAGENT RETURN: При делегации ВСЕГДА добавляй:
     "После завершения ВЕРНИ результат и управление вызывающему агенту."
  4. TIMEOUT: Если задача затягивается — сообщи статус
  5. FAIL FAST: После 3 неудачных попыток → STOP и сообщи
</anti_hang>

---

## Skill Loading Protocol

<skill_loading>
  Skill tool может быть недоступен (`Available skills: none`).
  Загружай скиллы через fallback-цепочку:

  1. Попробуй инструмент `skill` по имени: `skill({ name: "{skill_name}" })`
  2. Если ошибка → прочитай локальный manifest: `read(".opencode/skills/{skill_name}/SKILL.md")`
  3. Если локально нет → прочитай глобальный manifest: `read("~/.config/opencode/skills/{skill_name}/SKILL.md")`
  4. (Альтернатива Windows) `read("%USERPROFILE%/.config/opencode/skills/{skill_name}/SKILL.md")`
  5. Если всё не работает → продолжай БЕЗ скилла, не блокируй задачу

  Скиллы — справочные, не критичные. Их отсутствие НЕ ДОЛЖНО останавливать работу.

  Доступные скиллы:
  - `python` — Python patterns (typing, async, tests)
  - `typescript` — TypeScript/React/Vue patterns
  - `csharp` — C#/.NET patterns (async, EF Core)
  - `git` — Git workflow & Conventional Commits
  - `database-sql` — SQL, ORM, migrations, transactions
  - `security-owasp` — OWASP, XSS, CSRF, secrets
  - `devops-docker` — Docker and CI/CD practices
  - `context7` — Context7 MCP usage
  - `docs-sync` — Documentation synchronization
  - `incident-response` — Incident response workflow
  - `api-change-safe` — API change safety
  - `repomap` — Repository map workflow
  - `ast-index` — Fast AST-based code search (usages, hierarchy, outline)
  - `review-code-strategy` — Reviewer baseline strategy
  - `review-code-checklist` — Reviewer actionable checklist
  - `config-migration` — Source-first migration discipline
</skill_loading>

---

## Smart Problem Solving (Safety Net)

<smart_problem_solving>
  При получении ошибки ОБЯЗАТЕЛЬНО:
  
  1. ПРОЧИТАЙ сообщение об ошибке
  2. Определи тип:
  
  <if condition="МОЯ ошибка">
    Признаки: "syntax error", "not found", "typo"
    Действие: Исправь свою команду. НЕ меняй инструмент.
  </if>
  
  <if condition="ПРОСТАЯ ПРИЧИНА">
    Признаки: "port in use", "permission denied"
    Действие: Устрани причину напрямую.
  </if>
  
  <if condition="ПРОБЛЕМА ИНСТРУМЕНТА">
    Признаки: "internal error", "unexpected"
    Действие: Попробуй альтернативный инструмент.
  </if>
  
  ЗАПРЕЩЕНО: прыгать на альтернативу БЕЗ анализа ошибки.
</smart_problem_solving>

---

## Context7 Integration (MANDATORY for external libs)

<context7_rule>
  Для ЛЮБОЙ внешней библиотеки (React, Next.js, FastAPI, etc.):
  
  1. НЕ угадывай API по памяти
  2. Используй Context7:
     ```
     context7_resolve_library_id(library="next.js")
     context7_get_library_docs(id="vercel/next.js", topic="server actions")
     ```
  3. См. полный скилл: `skills/context7/SKILL.md`
</context7_rule>

---

## Agent Architecture (v3.0)

### Structure
```
agents/
├── openagent.md      # Главный агент (default_agent)
├── contextscout.md
├── coder.md
├── debugger.md
├── tester.md
├── reviewer.md
├── planner.md
├── externalscout.md
└── docwriter.md
```

### Source Of Truth

- Runtime agent IDs, paths, and tool permissions: `opencode.json`
- Runtime behavior prompts: `agents/*.md`
- Runtime context system: `context/**/*.md`
- `registry.json` is metadata inventory, not execution truth.
- Canonical docs entrypoint: `PROJECT_GUIDE.md`.

Rule: if any doc conflicts with `opencode.json`, treat `opencode.json` as canonical.

### Delegation Flow
```
User -> openagent -> [delegate when needed]
                      |
                      +-> contextscout
                      +-> coder
                      +-> debugger
                      +-> tester
                      +-> reviewer
                      +-> planner
                      +-> externalscout
                      +-> docwriter
```

---

## Skills System

### Language Skills (`skills/<name>/SKILL.md`)
- `csharp.md` — .NET, EF Core, WPF, async
- `typescript.md` — React, Vue, Next.js
- `python.md` — FastAPI, SQLAlchemy, pytest

### Tool Skills (`skills/<name>/SKILL.md`)
- `context7.md` — Интеграция с Context7
  - Profile: `modern-design-research` для запросов на современный UI/дизайн
- `git.md` — Conventional commits, branching
- `docs-sync.md` — Синхронизация документации и соответствующих секций в PROJECT_GUIDE
- `incident-response.md` — Triage/containment/rollback/fix для продовых инцидентов
- `api-change-safe.md` — Безопасные API-изменения (compatibility/versioning/migration)

### Methodological Skills (`skills/<name>/SKILL.md`)
Эти скиллы автоматически делегируются OpenAgent'ом соответствующим субагентам:
- `brainstorming` — Извлечение требований и дизайн-решений до написания кода (planner)
- `test-driven-development` — Строгая разработка через тестирование (tester/coder)
- `systematic-debugging` — Системный подход к устранению багов (debugger)
- `single-flow-task-execution` — Пошаговое выполнение с валидацией (coder)
- И другие процессы для планирования (`writing-plans`), интеграции ветвей (`finishing-a-development-branch`) и код-ревью (`requesting-code-review`, `receiving-code-review`).

## Skill Activation Matrix

| Trigger | Skill | Required | Owner |
|---------|-------|----------|-------|
| Any write/edit code task | `{language}` | Yes | OpenAgent -> coder |
| API contract/schema change | `api-change-safe` | Yes | OpenAgent -> coder/tester/docwriter |
| External library/framework/API | `context7` | Yes | OpenAgent / externalscout |
| Modern design / UI modernization request | `context7` (modern-design-research profile) | Yes | OpenAgent -> externalscout -> coder |
| Modern backend stack upgrade request | `context7` (modern-backend-research profile) | Yes | OpenAgent -> contextscout -> externalscout -> coder -> tester |
| Git workflow (commit/changelog/release notes) | `git` (quality commit/PR protocol) | If task touches git history | OpenAgent |
| Test authoring | `{language}` + testing conventions from context | Yes | tester |
| Debug/build fix | language skill for target file type + `incident-response` | Yes | debugger |
| Documentation synchronization | `docs-sync` | Yes for docs-sync tasks | OpenAgent / docwriter |
| Release preparation / pre-tag sync | `docs-sync` (release-docs-sync profile) | Yes | OpenAgent / docwriter |

Rules:
1. OpenAgent chooses skill set before delegation and passes it in prompt.
2. Subagent must explicitly confirm loaded skills in first response line.
3. If required skill is missing, stop and report missing prerequisite.

---

## Project Initialization

Для корректной работы агентов и навыков (skills) в новых репозиториях необходимо инициализировать локальный `.opencode/` каталог. Используйте интерактивный установщик (работает на Windows, macOS и Linux):

```bash
npx opencode-init
# или локально:
node scripts/install.mjs
```

Установщик:
1. Создаст `.opencode/`
2. Скопирует базовые конфиги (`opencode.json`, `registry.json`)
3. Скопирует локально навыки, инструкции, контекст и bundled `bin/ast-index.exe`
4. Автоматически пропатчит `.gitignore`
5. Запустит валидацию (`validate-runtime-governance.mjs`) для проверки.

Для обновления уже установленной конфигурации повторно запусти тот же `npx opencode-init` / `node scripts/install.mjs --target=<project-root>`: отдельные `install:local` / `update:local` больше не поддерживаются.

---

## Token Economy

| Complexity | Variant | Use For |
|------------|---------|---------|
| Trivial | `minimal` | Yes/no, simple lookups |
| Low | `low` | Code search, docs |
| Medium | `medium` | Code generation |
| High | `high` | Complex reasoning |

Правило: Начинай с низких → повышай если надо.

---

## Language Matching

Всегда отвечай на языке пользователя:
- Detect language from user's message
- All responses in that language

---

## Human-Quality Standard

Goal: produce senior-level results that are clear, precise, and grounded in project facts.

Required writing behavior:
- Explain decisions with concrete project context, not generic phrases.
- Prefer concise, direct language; remove repetitive filler.
- State trade-offs explicitly when multiple options exist.
- Keep terminology stable across code, tests, and docs.

Required coding behavior:
- Favor minimal, high-signal changes over broad rewrites.
- Use readable names and clear boundaries (input/validation/errors/side-effects).
- Avoid over-engineering and hidden magic.
- Validate correctness with relevant checks before final output.

Final self-check before response:
1. Is this actionable on first read?
2. Is the rationale specific to this repo/task?
3. Is code/test/docs behavior consistent?
4. Are risks and limits called out clearly?

## Workflow Standards

### Before Any Code
1. Before changing `opencode.json`, `agents/*.md`, or `context/**/*.md` run `npm run validate:runtime`.
2. `pwd` — Verify directory.
3. Check for existing context (`Glob context/` or `Glob .opencode/context/`) before reading.
4. Load skill by name (`skill({ name: "typescript" })`, etc.).
5. For external libs -> Context7.
6. Research existing patterns.

### During Execution
- 4+ файлов → planner first (без confirm gate)
- Инкрементально: один шаг за раз
- Stop on Error: без подтверждения не чинить
- One-shot mode: только opt-in (`one-shot: on`, `/oneshot`, `сделай под ключ`); по умолчанию OFF

### After Completion
1. If behavior/policy/approach changed -> update corresponding sections in `PROJECT_GUIDE.md`
2. Ensure code/tests/docs remain consistent after changes
3. Brief summary
4. Suggest next steps
5. If one-shot was used -> return clear end-to-end result blocks (plan/execution/validation/docs-sync)
6. Обязательное Атомарное сохранение: `git commit` (если есть git) ИЛИ бэкап файлов в `.opencode/history/<timestamp>_<task>/`.

---

## Unified Delegation Contract

Every `task(...)` delegation must contain 4 mandatory blocks:

1. `Input`
   - Scope/files
   - Context loaded
   - Constraints
2. `Expected Output`
   - What artifacts must be returned
3. `Done Criteria`
   - Objective checks that mark task complete
4. `Return Format`
   - Exact response structure back to caller

Contract rules:
- No contract → do not delegate.
- If input is incomplete → report missing info and stop.
- Subagent must return control phrase at the end.
- After Task tool returns, ALWAYS continue processing — do not end turn.

---

## Never Do

- Hardcode secrets/credentials
- SQL string concatenation
- Trust unvalidated input
- Use `any` in TypeScript
- Skip error handling
- Прыгать на альтернативу без анализа ошибки

## Always Do

- Parameterized queries
- Input validation
- Environment variables for secrets
- Async/await for I/O
- Context7 для внешних библиотек
- Match user's language

---

## 🔀 Strict Delegation Enforcement

**НЕ ДЕЛАЙ САМ то, что должен делать специализированный агент.**

### Context Scout — когда вызывать (AUTO)
Перед задачей используй Task tool с agent `contextscout` если:
- Аудит / ревью / анализ проекта / проверка безопасности
- Задача затрагивает 4+ файлов
- Первая задача в сессии на незнакомом репозитории
- Пользователь просит найти контекст / паттерны / стандарты

### Таблица делегации

| Задача | Агент | Правило |
|--------|-------|---------|
| Написание/редактирование кода | `coder` | ВСЕГДА делегируй |
| Ошибки сборки/runtime | `debugger` | ВСЕГДА делегируй |
| Тесты | `tester` | ВСЕГДА делегируй |
| Code review / аудит / анализ | `reviewer` | contextscout → reviewer |
| Документация | `docwriter` | ВСЕГДА делегируй |
| 4+ файлов | `planner` | Сначала декомпозиция |

### Исключения (можно самому)
- Короткий ответ на вопрос ("что делает эта функция?")
- Правка конфигов `.md`/`.json`
- Bash-команды (git, npm, ls)

### НЕ исключение (ДЕЛЕГИРУЙ)
- "Проведи аудит" → contextscout + reviewer
- "Добавь фичу" → coder
- "Исправь баг" → debugger

Перед делегацией покажи:
```
Routing
- Condition: [тип задачи / причина]
- Agent: [subagent_type]
- Delegating...
```

Если выбран путь делегации, вызови Task tool в том же ходе сразу после Routing.
Не ставь user confirm/\"продолжай\" gate между Routing и вызовом Task tool.
После получения результата от Task tool — обработай его и продолжай (следующий шаг route или итоговый отчёт). Никогда не завершай ход сразу после вызова Task tool.
Никогда не останавливай цепочку делегаций после первого субагента — продолжай до конца route без паузы.
Никогда не выводи параметры Task tool как текст/JSON в чат.
