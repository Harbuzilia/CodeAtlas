# Essential Patterns | Основные паттерны

## Quick Reference | Краткая справка

Core Philosophy: Modular, Functional, Maintainable
Базовая философия: Модульность, Функциональность, Поддерживаемость

ALWAYS | ВСЕГДА:
- Handle errors gracefully | Обрабатывай ошибки gracefully
- Validate input | Валидируй входные данные
- Use env vars for secrets | Используй env переменные для секретов
- Write pure functions | Пиши чистые функции

NEVER | НИКОГДА:
- Expose sensitive info | Не выставляй секретные данные
- Hardcode credentials | Не хардкодь креды
- Skip input validation | Не пропускай валидацию
- Mutate global state | Не мутируй глобальное состояние

---

## Core Principles | Базовые принципы

### 1. Pure Functions | Чистые функции

```
Same input = Same output
No side effects
No external state mutation
Predictable and testable
```

### 2. Error Handling | Обработка ошибок

```csharp
// Good: Error handling with logging
try
{
    var result = await ProcessAsync(input);
    return Ok(result);
}
catch (ValidationException ex)
{
    _logger.LogWarning(ex, "Validation failed for input: {InputId}", input.Id);
    return BadRequest(ex.Message);
}
catch (Exception ex)
{
    _logger.LogError(ex, "Unexpected error processing {InputId}", input.Id);
    return StatusCode(500, "Internal server error");
}

// Bad: Silent failure
try { DoSomething(); }
catch { } // Silent failure - NEVER
```

### 3. Input Validation | Валидация ввода

```csharp
// Good: Validate at boundaries
public async Task<Result> ProcessAsync(UserRequest request)
{
    if (request is null) 
        throw new ArgumentNullException(nameof(request));
    
    if (string.IsNullOrWhiteSpace(request.Email))
        return Result.Fail("Email is required");
    
    if (!IsValidEmail(request.Email))
        return Result.Fail("Invalid email format");
    
    // Now process validated input
}
```

### 4. Security | Безопасность

```csharp
// Good: Parameterized queries
var query = "SELECT * FROM users WHERE id = @id";
cmd.Parameters.AddWithValue("@id", userId);

// Bad: SQL Injection vulnerable
var query = $"SELECT * FROM users WHERE id = {userId}";

// Good: Environment variables for secrets
var apiKey = Environment.GetEnvironmentVariable("API_KEY");

// Bad: Hardcoded credentials
var apiKey = "sk-12345-secret"; // NEVER
```

---

## Code Structure | Структура кода

### Modular Architecture | Модульная архитектура

```
/src
├── Domain/           # Business logic, entities
├── Application/      # Use cases, DTOs, interfaces
├── Infrastructure/   # External: DB, APIs, files
└── Presentation/     # Controllers, UI
```

### Size Limits | Ограничения размера

| Element | Max Lines |
|---------|-----------|
| Function/Method | 50 |
| Class | 200 |
| File | 400 |
| Nesting depth | 3 levels |

---

## Async/Await Patterns | Паттерны async/await

```csharp
// Good: Always use CancellationToken
public async Task<User> GetUserAsync(int id, CancellationToken ct)
{
    return await _context.Users
        .AsNoTracking()
        .FirstOrDefaultAsync(u => u.Id == id, ct);
}

// Good: ConfigureAwait(false) in libraries
await SomeOperationAsync().ConfigureAwait(false);

// Bad: Never block async code
var result = GetAsync().Result; // DEADLOCK RISK
var result = GetAsync().GetAwaiter().GetResult(); // DEADLOCK RISK
```

---

## Naming Conventions | Соглашения об именах

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `UserService` |
| Interfaces | IPascalCase | `IUserRepository` |
| Methods | PascalCase | `GetUserById` |
| Properties | PascalCase | `FirstName` |
| Private fields | _camelCase | `_userRepository` |
| Parameters | camelCase | `userId` |
| Constants | UPPER_CASE | `MAX_RETRY_COUNT` |

---

## Anti-Patterns | Анти-паттерны

###  Избегай

| Anti-Pattern | Почему плохо | Решение |
|--------------|-------------|---------|
| God Class | Слишком много ответственностей | Разбить на малые классы |
| Magic Numbers | Непонятно что означают | Использовать константы |
| Deep Nesting | Трудно читать | Early return, extract methods |
| Copy-Paste | Дублирование = баги | Extract to shared function |
| Silent Catch | Скрывает ошибки | Log and handle properly |
| Service Locator | Скрытые зависимости | Constructor injection |

---

## Quick Checklist | Быстрый чеклист

Before committing | Перед коммитом:

- [ ] Pure functions (no side effects)
- [ ] Input validation
- [ ] Error handling with logging
- [ ] No hardcoded secrets
- [ ] SQL injection safe
- [ ] Async/await correct
- [ ] Tests written
- [ ] Documentation updated

---

## See Also | Смотри также

- `standards/code.md` — детальные стандарты кода
- `standards/tests.md` — стандарты тестирования
- `workflows/review.md` — процесс code review
