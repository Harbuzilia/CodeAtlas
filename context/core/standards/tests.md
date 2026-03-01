# Test Standards | Стандарты тестирования

## Purpose | Цель

ОБЯЗАТЕЛЬНО загружать перед написанием/редактированием тестов.

---

## Core Principles | Базовые принципы

### 1. Arrange-Act-Assert (AAA)

```csharp
[Fact]
public async Task CreateUser_WhenValidInput_ReturnsCreatedUser()
{
    // Arrange - подготовка
    var request = new CreateUserRequest("John", "john@example.com");
    var expected = new User { Name = "John", Email = "john@example.com" };
    
    // Act - действие
    var result = await _sut.CreateUserAsync(request);
    
    // Assert - проверка
    result.Should().NotBeNull();
    result.Name.Should().Be(expected.Name);
    result.Email.Should().Be(expected.Email);
}
```

### 2. Positive + Negative Tests

Каждая функция должна иметь минимум:
- 1 positive test (успешный сценарий)
- 1 negative test (ошибка/невалидные данные)

```csharp
// Positive test
[Fact]
public async Task GetUser_WhenUserExists_ReturnsUser()
{
    // Arrange
    var userId = 1;
    _mockRepo.Setup(r => r.GetByIdAsync(userId, default))
        .ReturnsAsync(new User { Id = userId });
    
    // Act
    var result = await _sut.GetUserAsync(userId);
    
    // Assert
    result.Should().NotBeNull();
    result.Id.Should().Be(userId);
}

// Negative test
[Fact]
public async Task GetUser_WhenUserNotFound_ThrowsNotFoundException()
{
    // Arrange
    var userId = 999;
    _mockRepo.Setup(r => r.GetByIdAsync(userId, default))
        .ReturnsAsync((User?)null);
    
    // Act
    var act = () => _sut.GetUserAsync(userId);
    
    // Assert
    await act.Should().ThrowAsync<NotFoundException>()
        .WithMessage($"*{userId}*");
}
```

### 3. Naming Convention

Pattern: `MethodName_WhenCondition_ExpectedBehavior`

| Good | Bad |
|---------|--------|
| `CreateOrder_WhenCartEmpty_ThrowsValidationException` | `TestCreateOrder` |
| `Login_WhenPasswordWrong_ReturnsFalse` | `LoginTest1` |
| `GetUsers_WhenNoFilters_ReturnsAllUsers` | `TestGetUsersMethod` |

---

## Test Types | Типы тестов

### Unit Tests

```csharp
// Тестируют один unit в изоляции
// Мокают все зависимости
// Быстрые (< 100ms)

[Fact]
public void CalculateDiscount_WhenPremiumUser_Returns20Percent()
{
    // Arrange
    var user = new User { IsPremium = true };
    var calculator = new DiscountCalculator();
    
    // Act
    var discount = calculator.Calculate(user, 100m);
    
    // Assert
    discount.Should().Be(20m);
}
```

### Integration Tests

```csharp
// Тестируют взаимодействие компонентов
// Могут использовать реальную БД (in-memory)
// Медленнее unit tests

public class UserApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task CreateUser_ReturnsCreatedAndPersistsUser()
    {
        // Arrange
        var client = _factory.CreateClient();
        var request = new { Name = "Test", Email = "test@example.com" };
        
        // Act
        var response = await client.PostAsJsonAsync("/api/users", request);
        
        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var user = await response.Content.ReadFromJsonAsync<User>();
        user.Id.Should().BeGreaterThan(0);
    }
}
```

---

## Mocking | Моки

### When to Mock | Когда мокать

| Mock | Don't Mock |
|------|------------|
| Databases | Pure functions |
| External APIs | Value objects |
| File system | DTOs |
| Time/Random | Simple calculations |
| Email services | |

### Example

```csharp
public class UserServiceTests
{
    private readonly Mock<IUserRepository> _mockRepo;
    private readonly Mock<ILogger<UserService>> _mockLogger;
    private readonly UserService _sut;
    
    public UserServiceTests()
    {
        _mockRepo = new Mock<IUserRepository>();
        _mockLogger = new Mock<ILogger<UserService>>();
        _sut = new UserService(_mockRepo.Object, _mockLogger.Object);
    }
    
    [Fact]
    public async Task GetUser_CallsRepositoryOnce()
    {
        // Arrange
        var userId = 1;
        _mockRepo.Setup(r => r.GetByIdAsync(userId, default))
            .ReturnsAsync(new User { Id = userId });
        
        // Act
        await _sut.GetUserAsync(userId);
        
        // Assert
        _mockRepo.Verify(r => r.GetByIdAsync(userId, default), Times.Once);
    }
}
```

---

## Edge Cases | Граничные случаи

Всегда тестируй:

| Category | Examples |
|----------|----------|
| Null/Empty | `null`, `""`, `[]`, `{}` |
| Boundaries | `0`, `-1`, `int.MaxValue`, `int.MinValue` |
| Special chars | `"<script>"`, `"'; DROP TABLE"` |
| Unicode | `"Юникод"`, `"Кириллица"`, `"Тест"` |
| Whitespace | `"  "`, `"\t\n"` |

```csharp
[Theory]
[InlineData(null)]
[InlineData("")]
[InlineData("   ")]
public void ValidateEmail_WhenEmptyOrNull_ReturnsFalse(string? email)
{
    // Act
    var result = EmailValidator.IsValid(email);
    
    // Assert
    result.Should().BeFalse();
}
```

---

## Test Organization | Организация тестов

```
/Tests
├── Unit/
│   ├── Services/
│   │   ├── UserServiceTests.cs
│   │   └── OrderServiceTests.cs
│   └── Validators/
│       └── EmailValidatorTests.cs
├── Integration/
│   ├── Api/
│   │   └── UserApiTests.cs
│   └── Database/
│       └── UserRepositoryTests.cs
└── Fixtures/
    ├── TestDataBuilder.cs
    └── DatabaseFixture.cs
```

---

## Frameworks by Language | Фреймворки

| Language | Unit Test | Assertion | Mock |
|----------|-----------|-----------|------|
| C# | xUnit / NUnit | FluentAssertions | Moq / NSubstitute |
| Python | pytest | pytest | pytest-mock / unittest.mock |
| TypeScript | Jest / Vitest | expect / chai | jest.fn() / sinon |
| Go | testing | testify | gomock |

---

## Quality Checklist | Чеклист качества

Перед завершением:

- [ ] Каждый метод имеет positive test
- [ ] Каждый метод имеет negative test
- [ ] Edge cases покрыты
- [ ] Имена тестов по паттерну `Method_When_Expected`
- [ ] AAA структура соблюдена
- [ ] Все внешние зависимости замоканы
- [ ] Тесты запускаются < 5 секунд (unit)
- [ ] Нет flaky tests (network, time)
- [ ] Test coverage > 80%
