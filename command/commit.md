---
description: Умные conventional commits с автоматическим анализом изменений
---

# Commit Command | Команда /commit

Создаёт профессиональные git commits с:
- Conventional commit format
- Текстовый тип изменений
- Автоанализ diff для определения типа

## Workflow | Рабочий процесс

### 1. Проверь изменения

```bash
# Посмотри что изменено
git status --porcelain
git diff --cached  # Если есть staged
git diff           # Если нет staged
```

### 2. Определи тип изменений

Проанализируй diff и определи основной тип:

| Type | Когда использовать |
|------|-------------------|
| `feat` | Новая функциональность |
| `fix` | Исправление бага |
| `docs` | Документация |
| `style` | Форматирование, стиль |
| `refactor` | Рефакторинг без изменения поведения |
| `perf` | Улучшение производительности |
| `test` | Добавление/исправление тестов |
| `chore` | Build, конфиги, CI |

### 3. Дополнительные метки (опционально)

| Метка | Использование |
|-------|--------------|
| `ci` | CI/CD improvements |
| `security` | Security fixes |
| `remove` | Removing code/files |
| `add-dep` | Adding dependency |
| `remove-dep` | Removing dependency |
| `architecture` | Architectural changes |
| `breaking` | Breaking changes |
| `hotfix` | Critical hotfix |
| `init` | Initial commit |
| `release` | Release/version tag |
| `wip` | Work in progress |
| `ci-fix` | Fix CI build |
| `db` | Database changes |
| `i18n` | Internationalization |
| `a11y` | Accessibility |
| `comments` | Comments in code |
| `experimental` | Experimental features |

### 4. Формат сообщения

```
<type>: <description>

[optional body]

[optional footer]
```

Правила:
- Императив: "add feature" НЕ "added feature"
- Первая строка < 72 символов
- Описание с маленькой буквы
- Без точки в конце

### 5. Примеры

```bash
feat: add user authentication system
fix: resolve memory leak in image processing
docs: update API documentation with new endpoints
refactor: simplify error handling in parser
perf: optimize database queries for user list
test: add unit tests for payment service
chore: update eslint configuration
fix: patch XSS vulnerability in comments
feat: change API response format (breaking)
fix: critical auth bypass vulnerability
refactor: migrate to clean architecture
```

## Автоматический режим

Если пользователь вызвал `/commit` без аргументов:

1. Stage all changes (если ничего не staged):
   ```bash
   git add .
   ```

2. Анализируй diff:
   ```bash
   git diff --cached --stat
   git diff --cached
   ```

3. Определи тип по содержимому:
   - Новые файлы с логикой → `feat`
   - Изменения в существующем коде → `fix` или `refactor`
   - Только тесты → `test`
   - Только документация → `docs`
   - Только конфиги → `chore`

4. Сгенерируй сообщение и покажи пользователю:
   ```
   ## Предлагаемый commit
   
   feat: add user registration endpoint
   
   Файлы:
   - src/controllers/UserController.cs (new)
   - src/services/UserService.cs (new)
   - tests/UserServiceTests.cs (new)
   
   Подтвердить? Или изменить сообщение?
   ```

5. После подтверждения:
   ```bash
   git commit -m "feat: add user registration endpoint"
   git push
   ```

6. Отчёт:
   ```
   Commit создан: abc1234
   Pushed to origin/main
   
   feat: add user registration endpoint
   3 files changed, 150 insertions(+)
   ```

## С аргументом

Если пользователь указал сообщение: `/commit fix login bug`

1. Определи тип из сообщения
2. Добавь тип
3. Оформи в conventional format
4. Выполни commit

```
/commit fix login bug
→ fix: resolve login bug

/commit add dark mode
→ feat: add dark mode

/commit update readme
→ docs: update readme
```

## Validation | Валидация

Перед commit проверь:

- [ ] Нет secrets в diff (API keys, passwords)
- [ ] Нет debug кода (`console.log`, `debugger`)
- [ ] Нет TODO которые должны быть сделаны
- [ ] Сообщение понятно без контекста

Если найдены проблемы — предупреди и спроси продолжать ли.
