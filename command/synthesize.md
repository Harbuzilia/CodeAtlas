---
description: Сквозной автономный синтез фичи под ключ из текстового запроса или файла спецификации
---

# Synthesize Command | Команда /synthesize

## Назначение
Автономно синтезировать готовую фичу под ключ:
1. Автоматическая генерация спецификации из запроса (или чтение готового `.md` файла).
2. `architect` — проектирует схему БД, DTO и ADR.
3. `coder` — реализует backend и frontend логику.
4. `tester` — создает unit/integration тесты.
5. `devops` — настраивает контейнеризацию.
6. `heal` — прогоняет песочницу самовосстановления для гарантии 100% стабильности.

## Вход
- `/synthesize <текстовое описание фичи>` (например, `/synthesize модуль подписок со Stripe и генерацией инвойсов`)
- `/synthesize <путь к спецификации.md>` (например, `/synthesize specs/billing.md`)

## Пример вывода
```
====================================================
      👑 OPENCODE SPEC-TO-CODE SYNTHESIZER          
====================================================

1. 📝 Target Feature: "Stripe Subscription Billing"
2. 📐 Architecture Phase: Generated ADR & DB Schemas
3. 💻 Implementation Phase: Synthesized Backend & Frontend Code
4. 🧪 Testing Phase: Generated 14 Unit & Integration Tests
5. 🚢 DevOps Phase: Configured Docker & Environment Variables
6. 🩺 Verification Phase: Autonomous Sandbox Loop PASSED

🎉 Feature synthesized successfully with 100% Quality Gates verified!
====================================================
```
