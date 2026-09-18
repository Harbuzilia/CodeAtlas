---
name: i18n-localization
description: Стандарты интернационализации (i18n/l10n), структуры словарей (JSON/PO/RESX), плюрализация и форматирование дат/валют
---

# Internationalization & Localization (i18n) Skill

<context>
Этот скилл содержит правила интернационализации и локализации пользовательских интерфейсов и backend-сообщений (React, Next.js, Vue, .NET, Python).
Используется агентами `coder`, `docwriter`, `uitester`.
</context>

## 1. Организация словарей и ключей

1. **Иерархическая структура ключей**:
   - Группируй переводы по фичам/страницам: `auth.login.title`, `checkout.payment.submit_btn`.
   - Файлы локалей: `locales/ru.json`, `locales/en.json`.

```json
{
  "auth": {
    "login": {
      "title": "Вход в аккаунт",
      "email_placeholder": "Введите email",
      "submit": "Войти",
      "error_invalid_credentials": "Неверный логин или пароль"
    }
  },
  "common": {
    "save": "Сохранить",
    "cancel": "Отмена",
    "loading": "Загрузка..."
  }
}
```

---

## 2. Плюрализация и переменные (ICU MessageFormat)

```json
{
  "cart": {
    "items_count": "{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}"
  }
}
```

- В коде (React):
  ```tsx
  const { t } = useTranslation();
  return <span>{t('cart.items_count', { count: totalItems })}</span>;
  ```

---

## 3. Форматирование дат, чисел и валют

- ❌ Запрещено форматировать вручную конкатенацией строк (`date + ' ' + time + ' $'`).
- ✅ Используй нативный `Intl API`:
  ```typescript
  // Валюта
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'RUB' }).format(1500);

  // Дата и время
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  ```

---

## 4. Чек-лист проверки i18n

- [ ] В UI компонентах (JSX/HTML/Views) отсутствуют захардкоженные строковые литералы
- [ ] Все ключи синхронизированы между всеми поддерживаемыми языками (`ru`, `en`)
- [ ] Настроена плюрализация для счетчиков
- [ ] Даты и числа форматируются через `Intl` API
