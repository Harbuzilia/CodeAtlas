# Code Standards | Стандарты кода

## Purpose | Цель

Этот файл содержит стандарты кода, которые ОБЯЗАТЕЛЬНЫ для загрузки перед любой задачей написания/редактирования кода.

---

## Language-Specific Standards | Стандарты по языкам

### C# / .NET

```csharp
// Good: Modern C# features
public record UserDto(int Id, string Name, string Email);

// Good: Pattern matching
return user switch
{
    { IsAdmin: true } => new AdminView(user),
    { IsPremium: true } => new PremiumView(user),
    _ => new StandardView(user)
};

// Good: Nullable reference types
public string? GetDisplayName(User? user)
{
    return user?.DisplayName ?? user?.Email ?? "Anonymous";
}

// Good: Dependency Injection
public class UserService : IUserService
{
    private readonly IUserRepository _repository;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository repository, ILogger<UserService> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }
}
```

Entity Framework Best Practices:
```csharp
// Good: AsNoTracking for read-only
var users = await _context.Users
    .AsNoTracking()
    .Where(u => u.IsActive)
    .ToListAsync(ct);

// Good: Include for related data (avoid N+1)
var orders = await _context.Orders
    .Include(o => o.Items)
    .Include(o => o.Customer)
    .Where(o => o.Status == OrderStatus.Pending)
    .ToListAsync(ct);

// Good: Projection to DTO (load only needed data)
var userDtos = await _context.Users
    .Select(u => new UserDto(u.Id, u.Name, u.Email))
    .ToListAsync(ct);
```

### Python

```python
# Good: Type hints
def get_user_by_id(user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()

# Good: Dataclasses for DTOs
@dataclass
class UserDto:
    id: int
    name: str
    email: str

# Good: Context managers for resources
async with aiohttp.ClientSession() as session:
    async with session.get(url) as response:
        data = await response.json()

# Good: Error handling
try:
    result = process_data(input_data)
except ValidationError as e:
    logger.warning(f"Validation failed: {e}")
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.error(f"Unexpected error: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail="Internal error")
```

### TypeScript

```typescript
// Good: Strict types
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

// Good: Type guards
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj
  );
}

// Good: Proper async error handling
async function fetchUser(id: number): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}
```

---

## SOLID Principles | Принципы SOLID

### S — Single Responsibility
```csharp
// Bad: Bad: класс делает слишком много
class UserManager
{
    public void CreateUser() { }
    public void SendEmail() { }
    public void GenerateReport() { }
    public void ValidatePassword() { }
}

// Good: Good: разделение ответственностей
class UserService { public void CreateUser() { } }
class EmailService { public void SendEmail() { } }
class ReportService { public void GenerateReport() { } }
class PasswordValidator { public bool Validate() { } }
```

### O — Open/Closed
```csharp
// Good: Open for extension, closed for modification
interface IPaymentProcessor { Task ProcessAsync(Payment payment); }

class CreditCardProcessor : IPaymentProcessor { }
class PayPalProcessor : IPaymentProcessor { }
class CryptoProcessor : IPaymentProcessor { } // New, no need to modify existing
```

### L — Liskov Substitution
```csharp
// Good: Derived classes must be substitutable for base
class Bird { public virtual void Fly() { } }
class Sparrow : Bird { } // Good: Can fly
// Bad: class Penguin : Bird { } // Can't fly - violates LSP

// Good: Better design
interface IFlyable { void Fly(); }
class Sparrow : Bird, IFlyable { }
class Penguin : Bird { } // No IFlyable
```

### I — Interface Segregation
```csharp
// Bad: Fat interface
interface IWorker
{
    void Work();
    void Eat();
    void Sleep();
}

// Good: Segregated interfaces
interface IWorkable { void Work(); }
interface IFeedable { void Eat(); }
interface ISleepable { void Sleep(); }
```

### D — Dependency Inversion
```csharp
// Bad: Tight coupling
class OrderService
{
    private SqlDatabase _db = new SqlDatabase(); // Concrete!
}

// Good: Depend on abstractions
class OrderService
{
    private readonly IDatabase _db;
    public OrderService(IDatabase db) => _db = db;
}
```

---

## File Organization | Организация файлов

```
/Feature
├── Feature.cs           # Main implementation
├── IFeature.cs          # Interface
├── FeatureDto.cs        # DTOs
├── FeatureValidator.cs  # Validation
├── FeatureException.cs  # Custom exceptions
└── Tests/
    ├── FeatureTests.cs
    └── FeatureIntegrationTests.cs
```

---

## Documentation | Документация

```csharp
/// <summary>
/// Retrieves a user by their unique identifier.
/// </summary>
/// <param name="id">The unique user identifier.</param>
/// <param name="cancellationToken">Cancellation token.</param>
/// <returns>The user if found; otherwise null.</returns>
/// <exception cref="ArgumentException">Thrown when id is less than 1.</exception>
public async Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken)
{
    if (id < 1)
        throw new ArgumentException("Id must be positive", nameof(id));
    
    return await _repository.GetByIdAsync(id, cancellationToken);
}
```

---

## Mandatory Checklist | Обязательный чеклист

Перед завершением работы над кодом:

- [ ] SOLID principles followed
- [ ] No SQL injection vulnerabilities
- [ ] Async/await used correctly with CancellationToken
- [ ] Input validation at boundaries
- [ ] Error handling with proper logging
- [ ] No hardcoded secrets
- [ ] Type hints / nullable annotations
- [ ] XML/doc comments for public APIs
- [ ] File size < 400 lines
- [ ] Method size < 50 lines
