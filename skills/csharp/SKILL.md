---
name: csharp
description: "C#/.NET 8+ паттерны: DI через интерфейсы, CancellationToken везде, без .Result/.Wait(), EF Core (AsNoTracking, split query, миграции), слои Domain/Application/Infrastructure/WebAPI"
---

# C# / .NET Skill

> **Context7**: API детали — через `context7_get_library_docs` (.NET, ASP.NET, EF Core). Этот файл — паттерны, не справочник.

## Когда использовать

.NET 8+ | C# 12+ | ASP.NET Core | EF Core | WPF/MAUI/Blazor | API-контракты в .NET backend

---

## Обязательный протокол

- Сначала минимальный безопасный план; без скрытых побочных рефакторов.
- Явные слои: Domain / Application / Infrastructure / WebAPI.
- Изменение API-контракта → тесты + docs-sync.

## Требования

- **DI через интерфейсы** (`AddScoped<IUserService, UserService>()`), не конкретные классы.
- **CancellationToken** во всех async методах (`ct = default`); `ConfigureAwait(false)` в библиотеках.
- **Никогда** `.Result` / `.Wait()` — deadlock risk. Только async/await сквозной.
- Nullable reference types включены, нет warnings.

## LINQ / EF Core

- Method syntax предпочтителен; projection (`Select`) — в БД, не в памяти.
- **`.AsNoTracking()`** для read-only запросов — всегда.
- Множественные `Include` на больших данных → `.AsSplitQuery()` (Cartesian explosion).
- Фильтрация до материализации: `Where` перед `ToListAsync`.
- Конфигурация сущностей — `IEntityTypeConfiguration<T>`, не атрибуты в entity.
- Миграции: `dotnet ef migrations add <Name>` → `dotnet ef database update`; откат — `database update <PreviousName>`.

## WPF / MVVM

- ViewModelBase с `SetProperty<T>` + `OnPropertyChanged([CallerMemberName])` — стандартный boilerplate, генерируй по месту.
- Команды — `RelayCommand`/`CommunityToolkit.Mvvm` (`[RelayCommand]`), не event handlers в code-behind.

## Tooling (если есть в проекте)

`dotnet format --verify-no-changes && dotnet build -warnaserror && dotnet test` — quality gate. Отсутствующий tooling не добавлять без запроса.

## Чек-лист перед коммитом

- [ ] XML-документация на публичных методах
- [ ] Nullable включены, нет warnings
- [ ] CancellationToken в async, нет `.Result`/`.Wait()`
- [ ] AsNoTracking на read-only запросах
- [ ] DI через интерфейсы
- [ ] Контракты API/DTO согласованы с тестами
- [ ] Тесты: happy path + edge cases
- [ ] При risk/prod change указан rollback/mitigation план
