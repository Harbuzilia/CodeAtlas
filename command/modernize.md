---
description: Автоматическая модернизация легаси-кода на современные стандарты (ESM, async/await, React 19)
---

# Modernize Command | Команда /modernize

## Назначение
Проанализировать файл или модуль и выполнить безопасный автоматический рефакторинг устаревших конструкций (CommonJS, `var`, Callback hell, React Class Components) на современные идиомы.

## Вход
- `/modernize <файл/директория>` (например, `/modernize src/legacy/auth.js`)
- `/modernize` без аргументов — сканирование проекта на легаси-паттерны

## Автоматический режим
1. Загрузить навык `code-modernization-patterns`.
2. Найти устаревшие конструкции (`require`, `var`, `module.exports`, `.then().catch()`).
3. Применить безопасную замену на современные стандарты (ESM, `const`/`let`, `async/await`).
4. Запустить `npm run validate:all` и тесты для подтверждения работоспособности.

## Пример вывода
```markdown
## 🔄 Модернизация `src/legacy/auth.js` завершена!

- Конвертирован из CommonJS в ESM (`import/export`)
- Заменены цепочки `.then()` на `async/await`
- Добавлены строгие типы TypeScript
- Все тесты пройдены: ✅ OK
```
