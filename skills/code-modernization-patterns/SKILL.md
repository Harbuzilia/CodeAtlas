---
name: code-modernization-patterns
description: Паттерны модернизации легаси-кода (CommonJS -> ESM, Callbacks -> async/await, React Class -> React 19 Hooks)
---

# Code Modernization Patterns Skill

<context>
Этот скилл содержит правила и паттерны безопасного рефакторинга устаревшего кода на современные стандарты (ESM, TypeScript 5, React 19, .NET 9, Python 3.12).
Используется агентами `coder`, `reviewer` и командой `/modernize`.
</context>

## 1. CommonJS (`require`) -> ESM (`import/export`)

```javascript
// ❌ Legacy CommonJS
const fs = require('fs');
const { calculateTax } = require('./taxService');
module.exports = { processInvoice };

// ✅ Modern ESM
import fs from 'node:fs';
import { calculateTax } from './taxService.js';
export { processInvoice };
```

---

## 2. Callback Hell / Promises -> `async/await`

```typescript
// ❌ Legacy Callback
function fetchUser(id, callback) {
  db.find(id, (err, user) => {
    if (err) return callback(err);
    callback(null, user);
  });
}

// ✅ Modern async/await
async function fetchUser(id: string): Promise<User> {
  return await db.find(id);
}
```

---

## 3. React Class Component -> React 19 Function Component

```tsx
// ❌ Legacy Class
class UserProfile extends React.Component {
  state = { name: '' };
  componentDidMount() { /* fetch */ }
  render() { return <div>{this.state.name}</div>; }
}

// ✅ Modern React 19 Hook
export function UserProfile() {
  const [name, setName] = useState('');
  useEffect(() => { /* fetch */ }, []);
  return <div>{name}</div>;
}
```

---

## 4. Чек-лист модернизации

- [ ] Заменены все `var` на `const` / `let`
- [ ] Использованы `node:` префиксы для встроенных модулей Node.js (`node:fs`, `node:path`)
- [ ] Все асинхронные цепочки переписаны на `async/await` с блоками `try/catch`
- [ ] 100% сохранена исходная бизнес-логика и сигнатуры публичных методов
