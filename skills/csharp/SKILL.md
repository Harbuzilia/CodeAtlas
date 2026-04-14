---
name: csharp
description: csharp skill reference
---

# C# / .NET Skill

> **Context7**: Для API деталей — ВСЕГДА используй `context7_get_library_docs` для .NET, ASP.NET, EF Core.
> Этот файл — **архитектурные паттерны и best practices**, не справочник по API.

---

## Когда использовать

Загружай этот скилл при работе с:
- .NET 8+ (или актуальная LTS)
- C# 12+
- ASP.NET Core
- Entity Framework Core
- WPF / MAUI
- Blazor
- API-контракты и сервисные изменения в .NET backend

---

## Архитектурные паттерны

### Human-grade protocol (обязательно)
- Перед изменениями фиксируй минимальный безопасный план.
- Меняй только необходимое для задачи, без скрытых побочных рефакторов.
- Явно разделяй слои: transport/application/infrastructure.
- Любое изменение API-контракта сопровождай тестами и docs-sync.

### Структура проекта

```
src/
├── Domain/           # Entities, ValueObjects, Enums
├── Application/      # UseCases, DTOs, Interfaces
├── Infrastructure/   # EF, External APIs, Repositories
├── WebAPI/           # Controllers, Middleware
└── Tests/
    ├── Unit/
    └── Integration/
```

### Dependency Injection

```csharp
// ✅ Правильно: регистрация через интерфейсы
services.AddScoped<IUserService, UserService>();
services.AddSingleton<ICacheService, RedisCacheService>();

// ❌ Неправильно: конкретные классы
services.AddScoped<UserService>();
```

### Async/Await паттерны

```csharp
// ✅ Правильно: CancellationToken везде
public async Task<User> GetUserAsync(int id, CancellationToken ct = default)
{
    return await _context.Users
        .AsNoTracking()
        .FirstOrDefaultAsync(u => u.Id == id, ct);
}

// ✅ Правильно: ConfigureAwait в библиотеках
var result = await _httpClient.GetAsync(url, ct).ConfigureAwait(false);

// ❌ Неправильно: блокирующие вызовы
var user = GetUserAsync(id).Result; // DEADLOCK RISK
```

### LINQ Best Practices

```csharp
// ✅ Method syntax (предпочтительно)
var adults = users
    .Where(u => u.Age >= 18)
    .OrderBy(u => u.Name)
    .Select(u => new UserDto(u.Id, u.Name))
    .ToList();

// ✅ Projection в базе данных
var names = await _context.Users
    .Where(u => u.IsActive)
    .Select(u => u.Name) // SQL: SELECT Name FROM Users
    .ToListAsync(ct);

// ❌ Неправильно: загрузка всего в память
var names = (await _context.Users.ToListAsync())
    .Where(u => u.IsActive)
    .Select(u => u.Name);
```

---

## Entity Framework Core

### Конфигурация сущностей

```csharp
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(u => u.Id);
        
        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(256);
            
        builder.HasIndex(u => u.Email)
            .IsUnique();
            
        builder.HasMany(u => u.Orders)
            .WithOne(o => o.User)
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

### Миграции

```bash
# Создание миграции
dotnet ef migrations add AddUserEmail --project Infrastructure

# Применение
dotnet ef database update

# Откат
dotnet ef database update PreviousMigrationName
```

### Производительность (Performance)

- **AsNoTracking**: ВСЕГДА используй `.AsNoTracking()` для запросов, которые только читают данные и не предполагают их изменение и сохранение через `SaveChanges()`.
- **Split Queries**: Для запросов с несколькими `Include()`, возвращающих много данных, используй `.AsSplitQuery()` для предотвращения декартова взрыва (Cartesian Explosion).
- **IQueryable vs IEnumerable**: Фильтруй данные на стороне БД (`Where` перед `ToList()`), а не в памяти.


---

## WPF / MVVM

### ViewModel базовый класс

```csharp
public abstract class ViewModelBase : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;
    
    protected void OnPropertyChanged([CallerMemberName] string? name = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
    
    protected bool SetProperty<T>(ref T field, T value, [CallerMemberName] string? name = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value)) return false;
        field = value;
        OnPropertyChanged(name);
        return true;
    }
}
```

### RelayCommand

```csharp
public class RelayCommand : ICommand
{
    private readonly Action _execute;
    private readonly Func<bool>? _canExecute;
    
    public RelayCommand(Action execute, Func<bool>? canExecute = null)
    {
        _execute = execute;
        _canExecute = canExecute;
    }
    
    public bool CanExecute(object? parameter) => _canExecute?.Invoke() ?? true;
    public void Execute(object? parameter) => _execute();
    
    public event EventHandler? CanExecuteChanged
    {
        add => CommandManager.RequerySuggested += value;
        remove => CommandManager.RequerySuggested -= value;
    }
}
```

---

## Modern Tooling (если есть в проекте)

```bash
dotnet format --verify-no-changes
dotnet build -warnaserror
dotnet test
```

- Если tooling/правила отсутствуют в проекте, не добавляй их автоматически без запроса.
- Если tooling есть, используй его как основной gate качества.

## Чек-лист перед коммитом

- [ ] Все публичные методы имеют XML-документацию
- [ ] Nullable reference types включены и нет warnings
- [ ] Async методы принимают CancellationToken
- [ ] EF запросы используют AsNoTracking() где возможно
- [ ] Нет .Result или .Wait() - только async/await
- [ ] DI через интерфейсы, не конкретные классы
- [ ] Контракты API и DTO согласованы с тестами
- [ ] Тесты покрывают happy path и edge cases
- [ ] При risk/prod change указан rollback/mitigation план
