---
description: Профессиональное код-ревью с фокусом на безопасность (SAST), качество и diff-исправления
---

# Review Command | Команда /review

## Назначение
Провести глубокое код-ревью (Security, Quality, Performance, Maintainability) по текущим изменениям (`git diff`) или указанному модулю.

## Вход
- `/review <файл/модуль>`
- `/review` без аргументов — автоматическое ревью текущего рабочего diff (`git diff`)

## Автоматический режим
1. Собрать diff: `git diff --cached` (если есть staged) или `git diff`.
2. Загрузить навыки `review-code-strategy`, `review-code-checklist` и `security-sast`.
3. Делегировать анализ агенту `reviewer` (в режиме READ-ONLY).
4. Проверить код по категориям:
   - **Security**: SQL-инъекции, IDOR, SSRF, утечки секретов/токенов.
   - **Quality & Architecture**: SOLID, DRY, обработка ошибок, чистота интерфейсов.
   - **Performance**: N+1 запросы, утечки ресурсов, избыточные аллокации.
   - **Testing**: Покрытие edge cases, наличие unit/negative тестов.
5. Вывести структурированный отчет с готовыми diff-блоками.

## Выход (формат)
```
## 🔍 Code Review Report

### Critical Issues (Блокирующие)
| # | Файл | Строка | Проблема | Рекомендация |
|---|------|--------|----------|--------------|
| 1 | `file.ts` | 42 | SQL Injection | Использовать параметризованные запросы |

### High / Medium Priority
| # | Файл | Строка | Проблема | Рекомендация |
|---|------|--------|----------|--------------|

### Предлагаемые diff-исправления
```diff
- // Проблемный код
+ // Исправленный код
```

### Вердикт: Approve | Request Changes | Block
```

## Пример
```
/review
/review src/auth/jwt.service.ts
```
