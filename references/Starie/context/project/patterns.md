# Project Patterns | Паттерны проекта

## Purpose | Цель

Этот файл содержит паттерны СПЕЦИФИЧНЫЕ для текущего проекта.
Редактируй его под свой проект.

---

## Project Info | Информация о проекте

**Name**: [Your Project Name]
**Language**: [C# / Python / TypeScript / etc.]
**Framework**: [ASP.NET Core / FastAPI / Vue / etc.]
**Architecture**: [Clean Architecture / Vertical Slices / etc.]

---

## Folder Structure | Структура папок

```
/src
├── Api/              # Controllers, endpoints
├── Application/      # Use cases, services
├── Domain/           # Entities, value objects
└── Infrastructure/   # DB, external APIs
```

---

## Naming Conventions | Соглашения об именах

| Element | Pattern | Example |
|---------|---------|---------|
| Controllers | `{Entity}Controller` | `UserController` |
| Services | `{Entity}Service` | `UserService` |
| Repositories | `I{Entity}Repository` | `IUserRepository` |
| DTOs | `{Action}{Entity}Dto` | `CreateUserDto` |
| Commands | `{Action}{Entity}Command` | `CreateUserCommand` |
| Queries | `Get{Entity}Query` | `GetUserByIdQuery` |

---

## API Patterns | Паттерны API

```csharp
// Standard controller pattern
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetById(int id, CancellationToken ct)
    {
        var user = await _userService.GetByIdAsync(id, ct);
        if (user is null) return NotFound();
        return Ok(user);
    }
}
```

---

## Error Handling | Обработка ошибок

```csharp
// Use Result pattern
public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
}

// Or domain exceptions
public class NotFoundException : DomainException { }
public class ValidationException : DomainException { }
```

---

## Database Patterns | Паттерны БД

```csharp
// Entity configuration
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).HasMaxLength(320).IsRequired();
        builder.HasIndex(u => u.Email).IsUnique();
    }
}
```

---

## Add Your Patterns | Добавь свои паттерны

[Добавь сюда специфичные паттерны твоего проекта]
