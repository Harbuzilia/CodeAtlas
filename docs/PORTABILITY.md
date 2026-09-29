# Portability | Переносимость между харнесами

Code Atlas спроектирован как источник истины, из которого синхронизируются
runtime-копии под конкретные харнесы. Ниже — что куда маппится и что остаётся
opencode-специфичным.

## Карта синхронизации (`npm run sync:all` / `scripts/sync-targets.mjs`)

| Харнес | Куда | Что копируется | Статус |
|-------------|------|----------------|--------|
| opencode (проект) | `.opencode/` | skills, agents, command, context, plugin | полный runtime (зеркало `sync:local`) |
| opencode (глобально) | `~/.config/opencode/` | skills, agents, command, context, plugin | полный |
| Pi | `~/.config/pi/` | те же 5 каталогов | полный |
| OhMyPi (OMP) | `~/.pi/` | те же 5 каталогов | полный |
| **Стандарт Agent Skills** | `~/.agents/skills/` | **только skills/** (плоско: `<skill>/SKILL.md`) | любой харнес стандарта; opencode сам читает этот путь |

## Слои переносимости

### Полностью переносимые (стандарт Agent Skills, agentskills.io)
- `skills/*/SKILL.md` — `name` = имя каталога (`^[a-z0-9]+(-[a-z0-9]+)*$`),
  `description` описывает «что делает + когда триггерится» (1-1024 символов).
  Гейт `validate:skills` держит это соответствие.
- `AGENTS.md` (корень) — инструкции уровня «прочитай меня первым»; нативно
  читаются opencode, Codex, Cursor и др.
- `context/` — стандарты кода/тестов/доков и workflow-протоколы: markdown
  без харнес-специфики (вход — `context/navigation.md`).
- `PROJECT_GUIDE.md`, `docs/` — документация системы.

### Требуют адаптации при переносе
- `agents/*.md` — промпты переносимы, но frontmatter-поля `mode`, `model`,
  `steps`, `permission` — семантика opencode (в других харнесах маппятся на их
  аналоги: у Claude Code — `tools`/`model` в frontmatter агента, у Codex — YAML-конфиг).
- `command/**/*.md` — формат slash-команд opencode (`description` frontmatter
  + markdown-шаблон); у других харнесов свои форматы команд.
- `config/model-presets.json` — маппинг «агент → модель» провайдеров из
  `opencode.json`; при переносе перечитывается под каталог моделей целевого харнеса.

### Opencode-специфичные (не переносятся)
- `plugin/*.js` (halt-guard, telemetry) — opencode Plugin API.
- `opencode.json` — провайдеры/модели/разрешения/инструкции.
- `~50 scripts/` — работают где угодно (Node 20+, без зависимостей), но
  включают opencode-специфичные валидаторы (`validate-runtime-governance.mjs` и т.п.).

## Windows

- Все скрипты — Node (без bash-специфики); `shell:true`-спавны используют
  кросс-шельные команды (`npm run`, `git`, `node`, `uvx`).
- Симлинки не требуются: зеркала — копии (`sync:local`/`sync:all`);
  `opencode-init.sh` на Git Bash делает fallback-копию, `opencode-init.ps1` —
  каноничный путь на Windows.
- Line endings закреплены `.gitattributes` (LF в репо; CRLF только `*.ps1/*.cmd/*.bat`).

## Добавить новый харнес («Dipsic» и другие)

1. Объяви его формат (где лежат скиллы/агенты/инструкции, какой frontmatter).
2. Добавь таргет в `scripts/sync-targets.mjs` (при необходимости — `flatten` или
   свой `sourceDirs`).
3. Если формат команд отличается — добавь конвертер `command/` → формат харнеса
   по образцу `generate-menu.mjs` (генерация из source of truth, с гейтом свежести).

## Распространение

- `npx skills add <owner>/<repo>` (vercel-labs/skills, реестр skills.sh):
  совместимо, т.к. скиллы строго по стандарту Agent Skills. На Windows
  рекомендуются copy-инсталляции (`--copy`), не symlink-режим.
