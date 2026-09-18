---
name: grpc-graphql-contracts
description: Проектирование контрактов gRPC (Protobuf 3) и GraphQL SDL, правила совместимости и защита от N+1
---

# gRPC & GraphQL Contracts Skill

<context>
Этот скилл содержит стандарты проектирования высокопроизводительных межсервисных контрактов (gRPC / Protobuf 3) и гибких клиентских API (GraphQL).
Используется агентами `coder`, `architect`, `reviewer`.
</context>

## 1. gRPC & Protocol Buffers v3

```protobuf
syntax = "proto3";

package payment.v1;

service PaymentService {
  rpc ProcessPayment (ProcessPaymentRequest) returns (ProcessPaymentResponse);
  rpc StreamTransactions (TransactionFilter) returns (stream TransactionEvent);
}

message ProcessPaymentRequest {
  string order_id = 1;
  int64 amount_cents = 2;
  string currency = 3;
}

message ProcessPaymentResponse {
  string transaction_id = 1;
  bool is_successful = 2;
  string error_message = 3;
}
```

### Правила обратной совместимости Protobuf:
1. **Никогда не меняй числовые теги полей (`= 1;`)**.
2. **При удалении поля объявляй его `reserved`**:
   ```protobuf
   reserved 4, 8;
   reserved "old_field_name";
   ```

---

## 2. GraphQL Schema & Защита от N+1 (DataLoader)

### 2.1 DataLoader для батчинга запросов
```typescript
// Загрузка пользователей батчем в 1 SQL запрос: WHERE id IN (...)
const userLoader = new DataLoader<string, User>(async (userIds) => {
  const users = await db.users.findMany({ where: { id: { in: userIds } } });
  return userIds.map(id => users.find(u => u.id === id) || null);
});
```

### 2.2 Лимиты сложности и глубины запросов
- Настраивай `graphql-depth-limit` (макс глубина 5–7 уровней).
- Ограничивай сложность запросов (Cost Analysis), чтобы предотвратить DoS-атаки.

---

## 3. Чек-лист контрактов

- [ ] Все Protobuf поля имеют стабильные теги и `reserved` для удаленных
- [ ] Все вложенные резолверы GraphQL используют DataLoader
- [ ] Настроены лимиты глубины и пагинация (Relay Connection `first`/`after`)
