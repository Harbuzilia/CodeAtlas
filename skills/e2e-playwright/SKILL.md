---
name: e2e-playwright
description: Автоматизация E2E тестирования с Playwright, Page Object Model, визуальная регрессия и Chrome DevTools
---

# Playwright E2E Testing Skill

<context>
Этот скилл содержит стандарты написания надежных, стабильных и быстрых E2E тестов на базе Playwright и интеграции с визуальным тестированием через Chrome DevTools.
</context>

## 1. Ключевые принципы Playwright

1. **User-Facing Locators**: Всегда используй локаторы, ориентированные на пользователя:
   - `page.getByRole('button', { name: 'Войти' })`
   - `page.getByLabel('Электронная почта')`
   - `page.getByPlaceholder('Введите имя')`
   - `page.getByTestId('order-submit-btn')`
   - ❌ **Избегай**: хрупких XPath и длинных CSS селекторов (`div > span:nth-child(3) > a`).
2. **Auto-Waiting**: Playwright автоматически ожидает видимости и кликабельности элементов. Избегай хардкодных таймаутов (`page.waitForTimeout()`).
3. **Page Object Model (POM)**: Инкапсулируй логику взаимодействия со страницей в отдельные классы.
4. **Изоляция состояния**: Каждый тест должен выполняться в изолированном контексте (clean storage state).

---

## 2. Структура Page Object Model

```typescript
// pages/LoginPage.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }
}
```

---

## 3. Написание тестов (Arrange-Act-Assert)

```typescript
// tests/auth.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Authentication Flow', () => {
  test('should show error with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('invalid@example.com', 'wrongpassword');

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('Invalid credentials');
  });
});
```

---

## 4. Визуальное тестирование и скриншоты
```typescript
// Скриншотное сравнение страницы или компонента
await expect(page).toHaveScreenshot('landing-page.png', {
  maxDiffPixelRatio: 0.05
});
```

---

## 5. Чек-лист перед коммитом тестов

- [ ] Использованы устойчивые `getByRole` / `getByTestId` локаторы
- [ ] Отсутствуют хардкодные `waitForTimeout`
- [ ] Реализованы positive и negative сценарии
- [ ] Логика вынесена в Page Object Model
- [ ] Тесты выполняются без flaky-поведения в headless режиме
