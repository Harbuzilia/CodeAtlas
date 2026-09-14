---
name: micro-frontends-federation
description: Архитектура Micro-Frontends, Module Federation 2.0 (Webpack/Vite/Rsbuild), singleton зависимости, Event Bus и Error Boundaries
---

# Micro-Frontends & Module Federation Skill

<context>
Этот скилл содержит стандарты проектирования распределенных веб-приложений (Micro-Frontends), динамической загрузки удаленных модулей (Module Federation 2.0) и межмодульного взаимодействия.
Используется агентами `coder`, `architect`, `uitester`.
</context>

## 1. Конфигурация Module Federation (Host / Remote)

```typescript
// rspack.config.js / vite.config.ts (Remote App)
export default {
  plugins: [
    new ModuleFederationPlugin({
      name: 'checkout_remote',
      filename: 'remoteEntry.js',
      exposes: {
        './CartWidget': './src/components/CartWidget',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    }),
  ],
};
```

---

## 2. Изоляция ошибок (React Error Boundary)

- Падение одного удаленного микрофронтенда **не должно ломать все приложение**.
- Оборачивай все `RemoteComponent` в Error Boundary с локальным Fallback UI:

```tsx
import React, { Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

const RemoteCart = React.lazy(() => import('checkout_remote/CartWidget'));

export function AppHeader() {
  return (
    <header>
      <Logo />
      <ErrorBoundary fallback={<div>Корзина временно недоступна</div>}>
        <Suspense fallback={<div>Загрузка...</div>}>
          <RemoteCart />
        </Suspense>
      </ErrorBoundary>
    </header>
  );
}
```

---

## 3. Межмодульное взаимодействие (Custom Event Bus)

- ❌ Не передавай глобальные Redux/Zustand сторы между микрофронтендами.
- ✅ Используй легковесную шину на базе `CustomEvent` / `window.dispatchEvent`:
  ```typescript
  // Отправка
  window.dispatchEvent(new CustomEvent('cart:item-added', { detail: { productId: '101' } }));

  // Подписка
  window.addEventListener('cart:item-added', (e: any) => console.log(e.detail));
  ```

---

## 4. Чек-лист Micro-Frontends

- [ ] Базовые библиотеки (`react`, `react-dom`) настроены как `singleton: true`
- [ ] Все удаленные микрофронтенды обернуты в `ErrorBoundary` и `Suspense`
- [ ] Взаимодействие построено на событиях (Event Bus), а не на прямой связанности сторов
