---
name: feature-flags-trunk-based
description: Feature Flags (булевы, процентные, пользовательские), Trunk-Based Development, безопасный fallback и очистка устаревших флагов
---

# Feature Flags & Trunk-Based Development Skill

<context>
Этот скилл содержит стандарты непрерывной интеграции (Trunk-Based Development), сокрытия незавершенного функционала под Feature Flags (Unleash, PostHog, LaunchDarkly) и безопасной раскатки.
Используется агентами `coder`, `architect`, `planner`.
</context>

## 1. Паттерн использования Feature Flag

```typescript
// Сервисный слой с безопасным Fallback
export async function getCheckoutSummary(userId: string): Promise<CheckoutSummary> {
  const isV2Enabled = await featureFlags.isEnabled('checkout_v2_redesign', {
    userId,
    fallback: false, // Безопасное поведение при сбое сервера флагов
  });

  if (isV2Enabled) {
    return calculateSummaryV2(userId);
  }
  return calculateSummaryLegacy(userId);
}
```

---

## 2. Жизненный цикл Feature Flag

1. **Создание (Temporary Toggle)**:
   - Имя должно быть явным: `new_payment_gateway_stripe`.
   - Обязательно указывать дату создания и владельца (Owner).
2. **Раскатка (Canary Rollout)**:
   - 0% -> Внутренние разработчики (Internal) -> 10% -> 50% -> 100%.
3. **Удаление (Deprecation & Cleanup)**:
   - После 100% стабильной работы в течение 14 дней флаг ОБЯЗАН быть удален из кодовой базы вместе с legacy веткой кода.

---

## 3. Чек-лист Feature Flags

- [ ] Все вызовы флагов имеют значение `fallback` по умолчанию
- [ ] Отсутствуют вложенные флаги глубже 2 уровней (флаг внутри флага — антипаттерн)
- [ ] Написаны unit-тесты для обоих состояний: `flag = true` и `flag = false`
- [ ] Установлен срок жизни флага (до 30–60 дней)
