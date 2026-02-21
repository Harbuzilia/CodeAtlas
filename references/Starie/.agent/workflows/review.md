---
description: Code Review с чеклистом безопасности и качества
icon: 🔍
---

# Code Review Workflow

Тщательный review кода перед мержем.

## Шаги

### 1. Определить scope
// turbo
```prompt
Определи что ревьюить: $ARGUMENTS

Если указаны файлы → используй их
Если нет → используй `git diff main`
```

### 2. Загрузить изменения
```bash
# Показать изменения
git diff main --stat
git diff main
```

### 3. Security Review
```prompt
Проверь на уязвимости (OWASP Top 10):

Чеклист:
- [ ] SQL Injection (параметризованные запросы?)
- [ ] XSS (экранирование вывода?)
- [ ] Sensitive Data (нет хардкода секретов?)
- [ ] Auth/Authz (проверки доступа?)
- [ ] Input Validation (валидация на входе?)
- [ ] CSRF (защита форм?)
- [ ] Insecure Dependencies (npm audit?)

Отметь найденные проблемы как 🔴 CRITICAL
```

### 4. Quality Review
```prompt
Проверь качество кода:

Чеклист:
- [ ] Именование понятное
- [ ] Функции < 50 строк
- [ ] Классы < 200 строк
- [ ] Нет дублирования
- [ ] SOLID соблюдён
- [ ] Обработка ошибок
- [ ] Логирование есть

Отметь проблемы как 🟡 WARNING
```

### 5. Performance Review
```prompt
Проверь производительность:

Чеклист:
- [ ] Нет N+1 запросов
- [ ] Async/await корректен
- [ ] Нет блокирующих вызовов
- [ ] Кеширование где нужно
- [ ] Индексы для частых запросов

Отметь проблемы как 🟠 PERFORMANCE
```

### 6. Tests Review
```prompt
Проверь тесты:

Чеклист:
- [ ] Тесты существуют
- [ ] Покрыт happy path
- [ ] Покрыты edge cases
- [ ] Моки корректны
- [ ] Тесты читаемы

Отметь проблемы как 🔵 TESTS
```

### 7. Сформировать отчёт
```prompt
Создай отчёт ревью:

# Code Review Report

## Summary
- Total issues: X
- 🔴 Critical: N
- 🟡 Warnings: N
- 🟠 Performance: N
- 🔵 Tests: N

## Critical Issues (блокеры)
[список]

## Recommendations
[список]

## Verdict
✅ APPROVED / ❌ CHANGES REQUIRED / ⚠️ APPROVED WITH NOTES
```

### 8. Условие: есть критичные проблемы?

**Если есть 🔴 CRITICAL:**
```prompt
Найдены критичные проблемы!
Исправь их и запусти /review снова.
```

**Если нет критичных:**
```prompt
Ревью завершён. Код готов к мержу с замечаниями.
```

---

## Как использовать

```
/review                    # Review текущих изменений vs main
/review src/auth/          # Review конкретной папки
/review UserService.cs     # Review конкретного файла
```
