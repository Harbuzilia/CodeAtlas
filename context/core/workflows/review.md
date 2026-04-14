# Review Workflow Context

## Purpose
Стандарты и чеклист для code review. Загружается агентом `reviewer`.

---

## Review Checklist

### 1. Code Quality
- [ ] Код читаемый и понятный
- [ ] Имена переменных/функций описательные
- [ ] Нет дублирования кода
- [ ] Функции делают одно дело (SRP)
- [ ] Нет magic numbers/strings

### 2. Logic
- [ ] Логика корректна
- [ ] Edge cases обработаны
- [ ] Условия понятны
- [ ] Нет бесконечных циклов

### 3. Error Handling
- [ ] Ошибки обрабатываются
- [ ] Нет пустых catch блоков
- [ ] Информативные сообщения об ошибках
- [ ] Ресурсы освобождаются (try-with-resources, using)

### 4. Security (OWASP)
- [ ] Нет SQL injection (параметризованные запросы)
- [ ] Нет XSS (экранирование вывода)
- [ ] Нет hardcoded credentials
- [ ] Input validation на границах
- [ ] Нет path traversal

### 5. Performance
- [ ] Нет N+1 запросов
- [ ] Большие операции вынесены в async
- [ ] Кеширование где нужно
- [ ] Нет утечек памяти

### 6. Tests
- [ ] Новый код покрыт тестами
- [ ] Тесты проходят
- [ ] Есть negative tests

---

## Conventional Comments

Формат комментариев при review:

```
<label>: <subject>

[discussion]
```

### Labels

| Label | Meaning |
|-------|---------|
| `nitpick:` | Мелочь, можно игнорировать |
| `suggestion:` | Предложение улучшения |
| `issue:` | Проблема, требует исправления |
| `question:` | Нужно уточнение |
| `thought:` | Мысль для обсуждения |
| `chore:` | Техническое (форматирование, импорты) |
| `praise:` | Похвала за хорошее решение |

### Examples

```
suggestion: Можно упростить с помощью Optional

Вместо if-null проверки:
user.map(User::getName).orElse("Unknown")
```

```
issue: Потенциальный NullPointerException

Параметр `userId` может быть null, нужна проверка.
```

```
nitpick: Лишняя пустая строка

Можно убрать для consistency.
```

---

## Severity Levels

| Level | Action |
|-------|--------|
| Critical | Блокирует merge. Security, data loss, crashes. |
| Major | Требует исправления. Logic errors, bad patterns. |
| Minor | Желательно исправить. Code style, naming. |
| Trivial | На усмотрение автора. Formatting, typos. |

---

## Review Process

1. Understand — Прочитать PR description
2. Check — Пройти по чеклисту
3. Comment — Использовать Conventional Comments
4. Summarize — Общий вердикт

### Verdicts

- Approve — Готово к merge
- Request Changes — Есть Critical/Major issues
- Comment — Только вопросы/suggestions

---

*Используется агентом `reviewer`*
