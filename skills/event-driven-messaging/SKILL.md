---
name: event-driven-messaging
description: Event-Driven архитектура, Transactional Outbox pattern, Idempotent Consumer, Dead Letter Queue (DLQ) и Kafka/RabbitMQ
---

# Event-Driven Messaging & Outbox Skill

<context>
Этот скилл содержит стандарты проектирования асинхронных событийно-ориентированных систем, очередей сообщений (Kafka, RabbitMQ, SQS) и предотвращения потери данных.
Используется агентами `coder`, `architect`, `reviewer`.
</context>

## 1. Паттерн Transactional Outbox (Гарантия доставки)

Никогда не отправляй сообщение в Kafka/RabbitMQ напрямую внутри транзакции БД (если брокер упадет, транзакция откатится или рассинхронизируется).

```sql
-- Таблица Outbox в той же транзакции, что и бизнес-логика
CREATE TABLE outbox_messages (
    id UUID PRIMARY KEY,
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_outbox_unprocessed ON outbox_messages (created_at) WHERE processed_at IS NULL;
```

---

## 2. Паттерн Idempotent Consumer (Дедупликация)

Сети ненадежны, поэтому события могут приходить повторно (At-Least-Once Delivery).

```typescript
async function handleOrderCreatedEvent(event: OrderCreatedEvent) {
  const isProcessed = await redis.set(`processed_event:${event.eventId}`, '1', 'NX', 'EX', 86400);
  if (!isProcessed) {
    logger.warn(`Duplicate event ignored: ${event.eventId}`);
    return; // Пропускаем дубликат
  }

  // Бизнес-логика обработки
  await processOrder(event.orderId);
}
```

---

## 3. Dead Letter Queue (DLQ) & Retry Topology

1. При временной ошибке (таймаут сети): повторить с экспоненциальным backoff (3 попытки: 1s, 5s, 30s).
2. При критической ошибке (невалидный JSON, ошибка бизнес-валидации): перенаправить сообщение в **DLQ** (`orders.dlq`) без блокировки очереди.

---

## 4. Чек-лист Event-Driven систем

- [ ] Публикация событий в брокер реализована через Transactional Outbox
- [ ] Все подписчики (Consumers) идемпотентны по `eventId`
- [ ] Настроена Dead Letter Queue (DLQ) и алертинг на скопление сообщений в DLQ
- [ ] Определены партиционные ключи (Partition Keys) для сохранения строгого порядка сообщений по сущности
