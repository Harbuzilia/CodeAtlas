---
name: documentation
description: Создание качественной документации - README, API docs, комментарии в коде, архитектурные описания
---

# Documentation Skill

## Типы документации

### README.md
```markdown
# Название проекта

Краткое описание (1-2 предложения)

## Возможности
- Фича 1
- Фича 2

## Быстрый старт

### Требования
- Node.js 18+
- PostgreSQL 15+

### Установка
\`\`\`bash
npm install
npm run dev
\`\`\`

### Конфигурация
| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| PORT | Порт сервера | 3000 |
| DB_URL | Строка подключения | - |

## API
[ссылка на документацию API]

## Разработка
[как запустить локально, тесты]

## Лицензия
MIT
```

### API документация

#### Endpoint описание
```markdown
## POST /api/users

Создание нового пользователя.

### Request
\`\`\`json
{
  "name": "string (required)",
  "email": "string (required, email format)",
  "role": "string (optional, default: 'user')"
}
\`\`\`

### Response 201
\`\`\`json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "createdAt": "ISO 8601"
}
\`\`\`

### Errors
- 400 - Невалидные данные
- 409 - Email уже существует
```

### Комментарии в коде

#### Когда комментировать
- ✅ Почему (бизнес-логика, workaround)
- ✅ Сложные алгоритмы
- ✅ Публичные API (JSDoc, XML docs)
- ❌ Что делает код (код должен быть самодокументируемым)

#### Формат
```csharp
/// <summary>
/// Рассчитывает скидку на основе истории покупок.
/// </summary>
/// <param name="userId">ID пользователя</param>
/// <returns>Процент скидки (0-30)</returns>
/// <exception cref="UserNotFoundException">Пользователь не найден</exception>
public decimal CalculateDiscount(Guid userId)
```

```typescript
/**
 * Рассчитывает скидку на основе истории покупок.
 * @param userId - ID пользователя
 * @returns Процент скидки (0-30)
 * @throws {UserNotFoundException} Пользователь не найден
 */
function calculateDiscount(userId: string): number
```

### Архитектурная документация

#### ADR (Architecture Decision Record)
```markdown
# ADR-001: Выбор базы данных

## Статус
Принято

## Контекст
Нужна БД для хранения пользователей и заказов.

## Решение
PostgreSQL

## Причины
- ACID транзакции
- JSON поддержка
- Опыт команды

## Последствия
- Нужен DBA для оптимизации
- Сложнее горизонтальное масштабирование
```

## Чеклист

### README
- [ ] Понятно что делает проект за 10 секунд
- [ ] Есть инструкция по установке
- [ ] Описаны переменные окружения
- [ ] Есть примеры использования

### API Docs
- [ ] Все endpoints описаны
- [ ] Примеры request/response
- [ ] Описаны коды ошибок
- [ ] Указаны required/optional поля

### Код
- [ ] Публичные методы задокументированы
- [ ] Сложная логика объяснена
- [ ] TODO/FIXME имеют контекст

## Формат вывода

```
## Тип документации
[README / API / Code comments / ADR]

## Документация
[готовый текст в markdown]
```
