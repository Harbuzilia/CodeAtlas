---
name: websocket-realtime-events
description: Стандарты WebSockets, Server-Sent Events (SSE), Heartbeat ping-pong, reconnection backoff и Redis Pub/Sub
---

# WebSocket & Real-Time Events Skill

<context>
Этот скилл содержит стандарты разработки real-time приложений, WebSocket соединений, Server-Sent Events (SSE), обработки сетевых сбоев и масштабирования через Redis Pub/Sub.
Используется агентами `coder`, `architect`, `reviewer`.
</context>

## 1. Паттерн Heartbeat (Ping-Pong) & Reconnection

```typescript
// Клиентский WebSocket с экспоненциальным backoff и heartbeat
class ResilientWebSocket {
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private pingInterval: NodeJS.Timeout | null = null;

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.retryCount = 0;
      this.startHeartbeat();
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000) + Math.random() * 1000;
      this.retryCount++;
      setTimeout(() => this.connect(url), delay);
    };
  }

  private startHeartbeat() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }
}
```

---

## 2. Server-Sent Events (SSE) для одностороннего стриминга

```typescript
// Fastify / Express SSE endpoint
app.get('/api/v1/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent('connected', { timestamp: Date.now() });
});
```

---

## 3. Масштабирование через Redis Pub/Sub

- Для нескольких экземпляров backend-сервера используй **Redis Pub/Sub** в качестве backplane:
  - Сервер А публикует событие в канал `events:rooms:100`.
  - Все серверы в кластере получают событие и рассылают его подключенным WebSocket-клиентам комнаты.

---

## 4. Чек-лист Real-Time событий

- [ ] Настроен Heartbeat (20–30 сек) для предотвращения тайм-аутов NAT/балансировщиков
- [ ] Клиент реализует переподключение с экспоненциальным backoff и джиттером
- [ ] При закрытии соединения все таймеры и подписки корректно очищаются (нет утечек памяти)
- [ ] Для многонодовых кластеров настроен Redis Pub/Sub adapter
