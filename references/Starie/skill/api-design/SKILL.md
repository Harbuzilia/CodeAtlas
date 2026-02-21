---
name: api-design
description: Проектирование REST API по best practices с правильными HTTP методами, статусами и структурой
---

# API Design Skill

## REST Принципы

### HTTP методы
| Метод | Действие | Идемпотентность |
|-------|----------|-----------------|
| GET | Получить | Да |
| POST | Создать | Нет |
| PUT | Заменить полностью | Да |
| PATCH | Частичное обновление | Нет |
| DELETE | Удалить | Да |

### URL структура
```
✅ GET    /users           - список
✅ GET    /users/{id}      - один
✅ POST   /users           - создать
✅ PUT    /users/{id}      - обновить
✅ DELETE /users/{id}      - удалить

❌ GET    /getUsers
❌ POST   /createUser
❌ GET    /users/delete/1
```

### HTTP статусы
```
2xx - Успех
  200 OK - GET, PUT, PATCH успешно
  201 Created - POST создал ресурс
  204 No Content - DELETE успешно

4xx - Ошибка клиента
  400 Bad Request - невалидные данные
  401 Unauthorized - не авторизован
  403 Forbidden - нет прав
  404 Not Found - ресурс не найден
  409 Conflict - конфликт (дубликат)
  422 Unprocessable Entity - валидация

5xx - Ошибка сервера
  500 Internal Server Error
  503 Service Unavailable
```

## Структура ответов

### Успешный ответ
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 100
  }
}
```

### Ошибка
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is invalid",
    "details": [
      { "field": "email", "message": "Invalid format" }
    ]
  }
}
```

## Чеклист

- [ ] URL - существительные, множественное число
- [ ] Версионирование - /api/v1/...
- [ ] Пагинация для списков
- [ ] Фильтрация через query params
- [ ] Консистентные ответы об ошибках
- [ ] Документация (OpenAPI/Swagger)

## Безопасность
- [ ] Аутентификация (JWT/OAuth)
- [ ] Rate limiting
- [ ] Валидация всех входных данных
- [ ] HTTPS only
