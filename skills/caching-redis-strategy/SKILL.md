---
name: caching-redis-strategy
description: Стратегии кэширования (Cache-Aside, Write-Through), Redis структуры, защита от Cache Stampede и инвалидация
---

# Caching & Redis Strategy Skill

<context>
Этот скилл содержит стандарты проектирования распределенного и in-memory кэширования, предотвращения Cache Stampede / Thundering Herd, тегированной инвалидации и работы с Redis.
Используется агентами `coder`, `architect`, `reviewer`.
</context>

## 1. Паттерны кэширования

### 1.1 Cache-Aside (Lazy Loading)
```typescript
async function getCachedUser(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const user = await db.users.findUnique({ where: { id: userId } });
  if (user) {
    await redis.set(cacheKey, JSON.stringify(user), 'EX', 3600); // 1 час TTL
  }
  return user;
}
```

---

## 2. Защита от Cache Stampede (Thundering Herd)

Когда популярный ключ кэша протухает, 1000 одновременных запросов могут упасть в БД.

### Решение 1: Mutex Lock (SingleFlight)
```typescript
// Только 1 запрос идет в БД за свежими данными, остальные ждут результат
const data = await singleFlight.do(`fetch:user:${userId}`, async () => {
  return await db.users.findUnique({ where: { id: userId } });
});
```

### Решение 2: Probabilistic Early Expiration (XFetch)
Пересчитывай кэш асинхронно в фоне до того, как он полностью протух.

---

## 3. Инвалидация и тегирование кэша

- **Теги кэша**: Привязывай сущности к тегам: `tags: ["users", "org:42"]`.
- При обновлении профиля пользователя инвалидируй только `tags: ["user:123"]` без сброса всего кэша (`FLUSHALL` запрещен в продакшене).

---

## 4. Чек-лист кэширования

- [ ] Все кэш-ключи имеют обязательный TTL (Time To Live)
- [ ] Настроена защита от Cache Stampede на hot keys
- [ ] Предусмотрена обработка недоступности Redis (Circuit Breaker / Fallback to DB)
- [ ] Используются оптимальные структуры Redis (Hashes вместо огромных JSON строк)
