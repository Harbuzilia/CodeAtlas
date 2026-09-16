# Opencode1 — конфиг-набор для Opencode CLI

Готовый пакет конфигурации для [Opencode](https://opencode.ai): закидываешь в проект —
и у тебя своя мультиагентная система со скиллами, slash-командами, валидаторами и релизным пайплайном.

## Что внутри

| Компонент | Объём | Где лежит |
|-----------|-------|-----------|
| Агенты | 12 (openagent — оркестратор, contextscout, coder, tester, reviewer и др.) | `agents/` |
| Скиллы | 37 (языки, безопасность, DevOps, AST-поиск, design) | `skills/` |
| Slash-команды | 23 + генерируемый `/menu` | `command/` |
| Плагины | 2 (halt-guard — авто-продолжение при зависании делегирования, telemetry — журнал роутинга) | `plugin/` |
| Скрипты | ~50 генераторов, валидаторов, бенчмарков | `scripts/` |
| Контекст-система | стандарты кода/тестов/доков, workflow-протоколы | `context/` |

Правила системы: `opencode.json` (source of truth) → `PROJECT_GUIDE.md` (обзор) → `PLANS.md` (трекер) → `CHANGELOG.md` (история).

## Установка

Требования: Node.js 20+, git.

```bash
git clone <repo> && cd opencode-config
npm ci
npm run sync:local     # генерирует runtime-зеркало .opencode/ из корня репо
npm run setup:hooks    # ставит git-хуки (pre-commit = полный прогон гейтов)
```

Запускай `opencode` из корня репозитория — он подхватит `opencode.json`, агентов и команды.

Установка в другой проект (копирует набор и ставит хуки):

```bash
npm run install:local -- --target=<путь-к-проекту>
```

## Ключевые команды

| Команда | Что делает |
|---------|------------|
| `npm run validate:all` | Все гейты: registry, ссылки, frontmatter, скиллы, права агентов, синк доков |
| `npm test` | Юнит-тесты (node:test) |
| `npm run test:mutate` | Мутационное тестирование валидаторов (100% kill rate) |
| `npm run menu:gen` | Регенерация `command/menu.md` |
| `npm run matrix` | Живая матрица агентов: бюджеты шагов, права, реестр скиллов |
| `npm run doctor` | Диагностика окружения opencode |
| `npm run bench` | Бенчмарки инструментов с тайм-бюджетами |
| `npm run release -- <patch\|minor\|major>` | Релиз: гейты → changelog из Conventional Commits → бамп версий → тег |
| `npm run release -- --dry-run` | Релиз без записи: полный прогон гейтов + превью |

Полный каталог команд: `docs/modules/scripts.md`.

## Slash-команды (в opencode)

Ключевые: `/menu` (карта всех команд), `/plan`, `/review`, `/test`, `/commit`, `/pr`,
`/matrix`, `/release`, `/doctor`, `/heal`, `/i18n`, `/prompt-engineering/prompt-optimizer`.

## Гарантии качества

- **CI** (`.github/workflows/ci.yml`): validate + тесты на Node 20.
- **Git-хуки**: pre-commit гоняет `validate:all`, pre-push — тесты + smoke.
- **Мутационное тестирование**: валидаторы обязаны ловить подсаженные дефекты.
- **Docs-sync гейт**: заявленные числа скиллов/команд в доках сверяются с диском.
- **Права агентов проверены на opencode 1.18.18**: `tools: false` дублируется `permission: deny`
  (см. `scripts/validate-agent-permissions.mjs` — с комментариями, что реально enforced в рантайме).

## Важно

- `.opencode/` — генерируемое runtime-зеркало (в gitignore), источник истины — корень репо.
- История и runtime-state агентов (для их же памяти) живут в `.opencode/history/`, `lessons_learned.md`, `shared_memory.json` — не удалять.
