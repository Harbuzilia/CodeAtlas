---
name: observability-opentelemetry
description: Стандарты сквозной наблюдаемости, OpenTelemetry трассировка, метрики Prometheus, Correlation-ID и Health Checks
---

# Observability & OpenTelemetry Skill

<context>
Этот скилл содержит стандарты и паттерны сквозной наблюдаемости (Observability), распределенной трассировки, сбора метрик и структурированного логирования для backend сервисов (Node.js, C#, Python, Go).
Используется агентами `coder`, `architect`, `devops`.
</context>

## 1. Сквозная трассировка (Correlation-ID & W3C Trace Context)

1. **Correlation / Request ID**:
   - Каждый входящий HTTP запрос должен получать или генерировать заголовок `X-Correlation-Id` (или `traceparent` по стандарту W3C).
   - `Correlation-ID` обязан передаваться во все исходящие HTTP/gRPC вызовы и сообщения в очередях (Kafka/RabbitMQ).
   - Все логи обязаны содержать `Correlation-ID` в структурированном виде:
     ```json
     {
       "timestamp": "2026-08-22T12:00:00Z",
       "level": "INFO",
       "message": "Order created successfully",
       "correlationId": "c8a49f10-7e3b-419b-a3d8-1c9f029b47e2",
       "orderId": "ord_1002"
     }
     ```

---

## 2. OpenTelemetry & Prometheus Метрики

### Node.js / Express / Fastify
```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('order-service');
const orderCounter = meter.createCounter('orders_created_total', {
  description: 'Total number of orders created',
});

// Increment metric
orderCounter.add(1, { status: 'success', payment_type: 'card' });
```

### C# / .NET 9
```csharp
// Program.cs
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter())
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddPrometheusExporter());
```

---

## 3. Health Checks (/health/live и /health/ready)

1. **Liveness (`/health/live`)**:
   - Отвечает `200 OK`, если процесс жив и может обрабатывать запросы (не завис в дедлоке).
2. **Readiness (`/health/ready`)**:
   - Отвечает `200 OK`, только если подключение к БД, Redis и зависимым сервисам успешно установлено.

---

## 4. Чек-лист Observability

- [ ] Все входящие запросы привязываются к `X-Correlation-Id`
- [ ] Логи структурированы в JSON (без `console.log` в production коде)
- [ ] Настроены эндпоинты `/health/live` и `/health/ready`
- [ ] Ключевые бизнес-метрики (счетчики, латентность) экспортируются в Prometheus / OTLP
