---
description: Карта назначений моделей на агентов и управление пресетами (quality/balanced/cost/speed)
---

# Presets Command | Команда /presets

## Назначение
Показать, на какой модели работает каждый агент, и переключить пресет назначения моделей. Пресеты — это данные в `config/model-presets.json`; применённый пресет записывается в frontmatter агентов (`model:` + `variant:`) и проверяется гейтом `npm run validate:models`.

## Вход
- `/presets` — текущая карта «агент → модель» активного пресета
- `/presets list` — все пресеты с описаниями
- `/presets apply <имя>` — применить пресет (`quality`, `balanced`, `cost`, `speed`)

## Поведение
1. Для `/presets` и `/presets list`: запусти `npm run models` (и `npm run models -- --list`) через bash и выведи результат как таблицу.
2. Для `/presets apply <имя>`: запусти `npm run models:apply -- <имя>`, затем `npm run validate:all` и покажи итог.
3. Перезапуск сессии не нужен: opencode читает `model:` агентов при следующем запуске — новые сессии получат новые модели сразу.
4. Штатный рантайм-переключатель текущей сессии — встроенная команда `/models` (TUI); `/presets` управляет конфигом, а не сессией.
5. Новую модель (MiniMax, GPT-5.x, Astro) сначала объяви в каталоге `provider.models` в `opencode.json`, затем добавь строку в пресет — `--check` поймает опечатку.

## Формат ответа
```
Активный пресет: quality — каждой роли её сильная сторона

  агент          модель
  openagent      google/antigravity-gemini-3-pro:high
  coder          google/antigravity-gemini-3-pro:high
  reviewer       google/antigravity-claude-sonnet-4-5
  ...

Пресеты: quality | balanced | cost | speed
```
