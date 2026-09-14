---
name: mock-service-virtualization
description: Виртуализация API, мокирование внешних сервисов (MSW, in-memory fixtures) для автономной разработки и E2E тестов
---

# API Mocking & Service Virtualization Skill

<context>
Этот скилл содержит стандарты и паттерны изолированной разработки и тестирования приложений без зависимости от внешних микросервисов, сторонних API (Stripe, OAuth2, Telegram, OpenAI) и нестабильной сети.
Используется агентами `coder`, `tester`, `uitester`.
</context>

## 1. Паттерны виртуализации

### 1.1 Mock Service Worker (MSW) для TypeScript / Browser / Node
```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('https://api.stripe.com/v1/payment_intents', async () => {
    return HttpResponse.json({
      id: 'pi_mock_123456789',
      status: 'succeeded',
      amount: 4990,
      currency: 'usd'
    }, { status: 200 });
  }),

  http.get('/api/v1/users/me', () => {
    return HttpResponse.json({
      id: 'usr_mock_1',
      email: 'alex@example.com',
      role: 'admin'
    });
  })
];
```

### 1.2 In-Memory Mock Репозитории (Domain / Service Layer)
```csharp
// Mock Payment Gateway for tests
public class FakePaymentGateway : IPaymentGateway
{
    private readonly ConcurrentDictionary<string, PaymentResult> _payments = new();

    public Task<PaymentResult> ChargeAsync(string customerId, decimal amount, CancellationToken ct)
    {
        var result = new PaymentResult("tx_fake_" + Guid.NewGuid(), Success: true);
        _payments[customerId] = result;
        return Task.FromResult(result);
    }
}
```

---

## 2. Лучшие практики мокирования

1. **Не мокай то, чем не владеешь (No Shallow Mocks)**: Мокай на границах системы (HTTP запросы, репозитории, очереди сообщений).
2. **Консистентность со спецификацией**: Ответы моков должны строго соответствовать `OpenAPI 3.1` спецификации проекта (`skills/api-openapi-spec`).
3. **Симуляция ошибок и задержек**: Всегда добавляй сценарии таймаута (`delay(5000)`), 401 Unauthorized, 429 Rate Limit и 500 Internal Error.

---

## 3. Чек-лист проверки моков

- [ ] Моки соответствуют актуальным OpenAPI контрактам
- [ ] Покрыты сценарии ошибок (4xx, 5xx, Network Error)
- [ ] In-memory состояние изолировано между тестовыми запусками
- [ ] Тесты запускаются и проходят в оффлайн-режиме (без доступа в Интернет)
