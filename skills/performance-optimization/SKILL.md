---
name: performance-optimization
description: Профилирование производительности, оптимизация CPU/памяти, устранение N+1 в ORM и бенчмаркинг
---

# Performance Optimization Skill

<context>
Этот скилл содержит стандарты и паттерны оптимизации производительности для backend и frontend приложений (TypeScript, Python, C#, SQL).
Используется при рефакторинге hot paths, профилировании утечек памяти, устранении медленных запросов и оптимизации бандлов.
</context>

## 1. Базовые правила оптимизации

1. **Не оптимизируй без метрик**: Сначала замерь базовую производительность (benchmark / profiling), затем вноси изменения и сравнивай.
2. **Алгоритмическая сложность**: Ищи возможности перевода \(O(n^2)\) в \(O(n)\) или \(O(1)\) через Hash Map, Set или префиксные деревья.
3. **Минимизация I/O**: Батчинг запросов к БД, connection pooling, сжатие данных и кеширование.
4. **Неблокирующий I/O**: Использование `async/await`, потоковой передачи (streaming) и генераторов для больших объемов данных.

---

## 2. Паттерны по технологиям

### C# / .NET
```csharp
// ✅ AsNoTracking для read-only запросов
var users = await _context.Users.AsNoTracking().Where(u => u.IsActive).ToListAsync(ct);

// ✅ AsSplitQuery для предотвращения декартова взрыва (Cartesian Explosion)
var orders = await _context.Orders
    .AsNoTracking()
    .Include(o => o.Items)
    .Include(o => o.Discounts)
    .AsSplitQuery()
    .ToListAsync(ct);

// ✅ ValueTasks & ArrayPool для hot paths
public ValueTask<int> FastCalculationAsync() { ... }
```

### TypeScript / Node.js
```typescript
// ✅ Потоковая обработка больших файлов (Streams вместо Buffer)
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

// ✅ Параллельные независимые запросы (Promise.allSettled)
const [user, permissions] = await Promise.all([
  fetchUser(userId),
  fetchPermissions(userId)
]);

// ✅ Избегание утечек памяти в event emitters и замыканиях
emitter.on('data', handler);
// Обязательно:
cleanup(() => emitter.off('data', handler));
```

### Python / FastAPI / SQLAlchemy
```python
# ✅ Генераторы для итерации по большим наборам данных
def stream_large_dataset(query):
    for batch in query.yield_per(1000):
        yield batch

# ✅ Избежание N+1 в SQLAlchemy
stmt = select(User).options(selectinload(User.orders))
result = await session.execute(stmt)
```

---

## 3. Базы данных и SQL
- **Индексы**: Создавай композитные индексы `(tenant_id, status, created_at)` под частые фильтры и сортировки.
- **Explain Plan**: Анализируй план выполнения (`EXPLAIN ANALYZE`).
- **N+1 Запросы**: Проверяй логи ORM на наличие повторяющихся одиночных `SELECT` запросов в цикле.

---

## 4. Чек-лист оптимизации

- [ ] Зафиксирован benchmark ДО оптимизации
- [ ] Устранены N+1 запросы и лишние `JOIN` / `Include`
- [ ] Read-only запросы не отслеживаются ORM (NoTracking)
- [ ] Большие коллекции передаются через stream/генераторы
- [ ] Проверены утечки памяти (таймеры, подписчики событий)
- [ ] Benchmark ПОСЛЕ оптимизации подтверждает выигрыш в скорости/памяти
