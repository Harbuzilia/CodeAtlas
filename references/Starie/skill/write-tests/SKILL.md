---
name: write-tests
description: Генерация качественных unit и integration тестов с покрытием edge cases
---

# Write Tests Skill

## Принципы

### Структура теста (AAA)
1. **Arrange** - подготовка данных
2. **Act** - выполнение действия
3. **Assert** - проверка результата

### Что тестировать
- Happy path - основной сценарий
- Edge cases - граничные значения
- Error cases - обработка ошибок
- Null/empty inputs - пустые значения

### Naming Convention
```
[Method]_[Scenario]_[ExpectedResult]
```
Пример: `CreateUser_WithValidData_ReturnsUser`

## Чеклист

### Unit тесты
- [ ] Каждый публичный метод покрыт
- [ ] Тестируются граничные значения
- [ ] Тестируются ошибочные сценарии
- [ ] Моки используются для внешних зависимостей
- [ ] Тесты изолированы друг от друга

### Integration тесты
- [ ] Тестируется взаимодействие компонентов
- [ ] Используется тестовая БД/окружение
- [ ] Данные очищаются после тестов

## Формат вывода

```csharp
// Пример для C#
[Fact]
public void MethodName_Scenario_ExpectedResult()
{
    // Arrange
    var sut = new SystemUnderTest();
    
    // Act
    var result = sut.Method(input);
    
    // Assert
    Assert.Equal(expected, result);
}
```

## Не делать
- ❌ Тесты зависящие друг от друга
- ❌ Тесты с реальными внешними сервисами
- ❌ Слишком много assertions в одном тесте
- ❌ Тестирование приватных методов напрямую
