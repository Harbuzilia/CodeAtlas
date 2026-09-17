# Provider Resilience & Fallback Workflow

> Context: workflows/resilience | Priority: high

## 1. Назначение
Этот протокол определяет поведение агентов при сбоях сети, HTTP 429 (Rate Limit), таймаутах API и исчерпании лимитов токенов.

---

## 2. Иерархия провайдеров (Provider Fallback Mesh)

```
[1. Primary Provider: Google Antigravity (antigravity-gemini-3-pro)]
      │ (При HTTP 429 / Timeout > 30s)
      ▼
[2. Secondary Fast Provider: Google Antigravity (antigravity-gemini-3-flash)]
      │ (При недоступности сервиса Google)
      ▼
[3. Failover Fallback: antigravity-claude-sonnet-4-5 / antigravity-gpt-oss-120b]
```

> Каталог моделей — `opencode.json` (провайдер `google`); назначения по ролям — пресет
> `config/model-presets.json` (команда `/presets`). Список выше — реальные ID из каталога.

---

## 3. Правила обработки ошибок (Error Recovery Rules)

### 3.1 Rate Limit (HTTP 429 / Quota Exceeded)
1. **Экспоненциальный Backoff**: Подождать `1s -> 2s -> 4s`.
2. Если повторный запрос завершился 429 — переключиться на резервную модель с меньшим расходом токенов (Flash/Sonnet).
3. Сократить объём контекста (включить агрессивную фильтрацию через DCP).

### 3.2 Таймауты сети и Connection Drops
1. Повторить запрос максимум 2 раза с интервалом 3 секунды.
2. При постоянной недоступности внешней сети (No Internet) — переключиться на автономный оффлайн-режим с использованием локальных навыков (`mock-service-virtualization`).

### 3.3 Превышение контекстного окна (Context Overflow)
1. Активировать сжатие истории через `@tarquinen/opencode-dcp`.
2. Оставить в контексте только активную задачу из `.opencode/task_state.md` и целевые файлы изменений.

---

## 4. Чек-лист отказоустойчивости

- [ ] Не падать при временных сетевых ошибках
- [ ] Использовать моки при недоступности внешних API
- [ ] Сохранять прогресс в `.opencode/task_state.md` перед тяжелыми операциями
