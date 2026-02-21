# Миграция: agent -> agents

Короткая operational note по переходу на схему `agents/*`.

## Зачем миграция
- Убрать неоднозначность между legacy-путями и текущим runtime.
- Зафиксировать единый Source of Truth для маршрутизации и делегации.
- Снизить регрессии из-за устаревших ссылок в документации.

## Checklist после миграции
- [ ] В `opencode.json` секция `agent` ссылается на `agents/*.md`.
- [ ] `default_agent` указывает на актуальный entrypoint (`openagent`).
- [ ] `PROJECT_GUIDE.md` использует `agents/**/*.md` как runtime-источник.
- [ ] В новых docs нет ссылок на `.opencode/agent/*` как на runtime-истину.
- [ ] Проверки проходят: `npm run validate:runtime`, `npm run smoke:functional`.

## Признаки корректного состояния
- Агентная маршрутизация работает без fallback на legacy-документы.
- Все зарегистрированные агенты из `opencode.json` существуют в `agents/`.
- Документация и runtime-конфиг не противоречат друг другу.
- При изменении поведения docs обновляются в том же цикле задачи.

## Rollback-идея
- Держать предыдущий рабочий `opencode.json` как точку возврата.
- При сбое вернуть последний стабильный mapping `agent` + `default_agent`.
- Повторно прогнать `validate:runtime` и `smoke:functional`.
- После стабилизации отдельно пересинхронизировать docs, чтобы убрать повторный drift.
