# Code Atlas — конфиг-набор для Opencode CLI

Готовый пакет конфигурации для [Opencode](https://opencode.ai): закидываешь в проект —
и у тебя своя мультиагентная система со скиллами, slash-командами, валидаторами и релизным пайплайном.
Репозиторий: [Harbuzilia/CodeAtlas](https://github.com/Harbuzilia/CodeAtlas). Лицензия: MIT.

> Переносимость: скиллы соответствуют стандарту Agent Skills (agentskills.io),
> инструкции — корневому `AGENTS.md`; opencode-специфика вынесена отдельно (см. `docs/PORTABILITY.md`).

## Что внутри

| Компонент | Объём | Где лежит |
|-----------|-------|-----------|
| Агенты | 12 (openagent — оркестратор, contextscout, coder, tester, reviewer и др.) | `agents/` |
| Скиллы | 37 (языки, безопасность, DevOps, AST-поиск, design) | `skills/` |
| Slash-команды | 24 + генерируемый `/menu` | `command/` |
| Плагины | 2 (halt-guard — авто-продолжение при зависании делегирования, telemetry — журнал роутинга) | `plugin/` |
| Скрипты | ~50 генераторов, валидаторов, бенчмарков | `scripts/` |
| Пресеты моделей | quality / balanced / cost / speed (агент → модель) | `config/model-presets.json` |
| Контекст-система | стандарты кода/тестов/доков, workflow-протоколы | `context/` |

Правила системы: `opencode.json` (source of truth) → `PROJECT_GUIDE.md` (обзор) → `PLANS.md` (трекер) → `CHANGELOG.md` (история).

## Установка

Требования: Node.js 20+, git, [opencode CLI](https://opencode.ai/docs/) (`npm install -g opencode-ai`, также `choco install opencode` / `scoop install opencode`).

```bash
git clone https://github.com/Harbuzilia/CodeAtlas.git && cd CodeAtlas
npm ci
npm run sync:local     # генерирует runtime-зеркало .opencode/ из корня репо
npm run setup:hooks    # ставит git-хуки (pre-commit = полный прогон гейтов)
```

Запускай `opencode` из корня репозитория — он подхватит `opencode.json`, агентов и команды.

### Windows

- Shell-инструмент opencode сам выбирает pwsh → powershell → Git Bash → cmd; если авто-детекция Git Bash хромает — задай `OPENCODE_GIT_BASH_PATH` (путь к `bash.exe`).
- `.opencode/` зеркалится **копиями** (`sync:local`), не симлинками — Developer Mode не нужен. `opencode-init.ps1` — каноничный init-скрипт для новых репо (Windows), `opencode-init.sh` — для Linux/macOS/Git Bash с fallback-копией.
- Линейные окончания закреплены в `.gitattributes` (LF в репо, CRLF только для `*.ps1/*.cmd/*.bat`).
- Официальные доки рекомендуют WSL ради скорости файловой системы — нативный Windows поддерживается этим набором полностью; скрипты проверены на Git Bash + cmd.
- Кодировки: PowerShell может вернуть mojibake на не-ASCII (upstream #23636, фиксы не смёржены). Garbled-выводу не верь: повтори с префиксом `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;` или через Git Bash (агенты это знают из instructions).

Установка в другой проект (копирует набор и ставит хуки):

```bash
npm run install:local -- --target=<путь-к-проекту>
npm run models:apply -- inherit   # проект со своим провайдером: агенты наследуют модель сессии
# или: npm run models:apply -- <пресет под локальный каталог моделей>
```

Без этого шага в проекте с чужим провайдером агенты с захардкоженными моделями упадут с
«Model not found» (фолбэка в opencode нет). `npm run doctor` подсветит несоответствия WARN-ом.

Глобальная синхронизация (`npm run sync:all`) пишет в `~/.config/opencode`, `~/.config/pi`, `~/.pi`
(+ `AGENTS.md` в global opencode); флаги `--dry-run` и `--only=<подстрока>`; общий каталог
`~/.agents/skills` — только opt-in (`--with-agents-skills`), чтобы не смешиваться со скиллами
других инструментов машины. Изменения применяются после перезапуска opencode.

## Ключевые команды

| Команда | Что делает |
|---------|------------|
| `npm run validate:all` | Все гейты: registry, ссылки, frontmatter, скиллы, права агентов, модели, синк доков |
| `npm test` | Юнит-тесты (node:test) |
| `npm run test:mutate` | Мутационное тестирование валидаторов (100% kill rate) |
| `npm run models:apply -- <пресет>` | Переназначить модели агентам (quality / balanced / cost / speed) |
| `npm run menu:gen` | Регенерация `command/menu.md` |
| `npm run matrix` | Живая матрица агентов: бюджеты шагов, права, реестр скиллов |
| `npm run doctor` | Диагностика окружения opencode |
| `npm run bench` | Бенчмарки инструментов с тайм-бюджетами |
| `npm run release -- <patch\|minor\|major>` | Релиз: гейты → changelog из Conventional Commits → бамп версий → тег |
| `npm run release -- --dry-run` | Релиз без записи: полный прогон гейтов + превью |

Полный каталог команд: `docs/modules/scripts.md`.

## Slash-команды (в opencode)

Ключевые: `/menu` (карта всех команд), `/plan`, `/review`, `/test`, `/commit`, `/pr`,
`/matrix`, `/presets` (карта моделей), `/release`, `/doctor`, `/heal`, `/i18n`,
`/prompt-engineering/prompt-optimizer`.

## Гарантии качества

- **CI** (`.github/workflows/ci.yml`): validate + тесты на Node 20.
- **Git-хуки**: pre-commit гоняет `validate:all`, pre-push — тесты + smoke.
- **Мутационное тестирование**: валидаторы обязаны ловить подсаженные дефекты.
- **Docs-sync гейт**: заявленные числа скиллов/команд в доках сверяются с диском.
- **Права агентов — permission-only**: deprecated `tools:` карты удалены из всех 12 агентов
  (opencode их игнорирует, а с 1.18.26 они ломают пользовательские permission-правила, issue #46873);
  гейт `validate-agent-permissions` запрещает их возврат и проверяет неэффективные path-globs.
- **Ноль approval-спама**: bash по умолчанию `allow`; аппрувы только на деструктив
  (`rm -rf`, `sudo`, force-push, `reset --hard`, drop/truncate — deny/ask последними правилами).
- **Без зависаний**: плагин `bash-guard` блокирует foreground dev-серверы/вотчеры до того, как они
  повесят shell-tool (upstream #49169); halt-guard уважает пользовательский abort и не воскрешает сессию.
- **Браузер**: `playwright-cli` (primary, интерактив + рост e2e-спеков) и `agent-browser`
  (визуал/a11y/vitals/профили/диагностика); Playwright MCP — опционально, не по умолчанию.

## Важно

- `.opencode/` — генерируемое runtime-зеркало (в gitignore), источник истины — корень репо.
- История и runtime-state агентов (для их же памяти) живут в `.opencode/history/`, `lessons_learned.md`, `shared_memory.json` — не удалять.
