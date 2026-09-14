---
name: secrets-config-management
description: Управление конфигурациями окружений (12-Factor App), runtime-валидация через Zod, маскирование секретов и ротация
---

# Secrets & Environment Config Management Skill

<context>
Этот скилл содержит стандарты безопасного управления конфигурациями и переменными окружения, их типизации, runtime-валидации и предотвращения падений сервиса из-за отсутствующих ключей.
Используется агентами `coder`, `architect`, `devops`.
</context>

## 1. Строгая валидация окружения (Zod / Env-Schema)

Никогда не используй нетипизированный `process.env.DATABASE_URL` напрямую в коде!

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  REDIS_URL: z.string().url().optional(),
});

// Валидация при старте приложения (Fail-Fast)
export const env = envSchema.parse(process.env);
```

---

## 2. Принципы 12-Factor Config & Шаблоны

- В репозитории хранится **только `.env.example`** без реальных паролей и токенов.
- Для секретов продакшена используются безопасные хранилища (Docker/K8s Secrets, HashiCorp Vault, AWS Secrets Manager).

---

## 3. Маскирование секретов в логах

- Все токены, пароли и номера карт обязаны маскироваться перед записью в лог:
  ```typescript
  function maskSecret(secret: string): string {
    if (secret.length <= 8) return '********';
    return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
  }
  ```

---

## 4. Чек-лист управления секретами

- [ ] Все переменные окружения валидируются при старте приложения через схему (Zod/Env-Schema)
- [ ] В репозитории присутствует актуальный `.env.example`
- [ ] Никакие секреты не выводятся в логи в открытом виде
- [ ] Настроены безопасные значения по умолчанию для локальной разработки
