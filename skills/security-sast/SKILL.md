---
name: security-sast
description: Статический аудит безопасности кода, защита от OWASP Top 10, утечек секретов, SSRF, IDOR и аудит зависимостей
---

# SAST Security Audit Skill

<context>
Этот скилл содержит правила статического анализа безопасности кода (SAST), проверки уязвимостей зависимостей и предотвращения критических уязвимостей в приложениях.
Используется агентами `reviewer`, `coder`, `debugger` при любом изменении кода и подготовке PR.
</context>

## 1. Топ уязвимостей и правила защиты

### 1.1 Инъекции (SQL / Command / Template Injection)
- **SQL**: Только параметризованные запросы или ORM-абстракции. Никакой конкатенации строк вида `SELECT * FROM table WHERE id = ' + input`.
- **Command**: Запрещено передавать неэкранированный пользовательский ввод в `exec`, `spawn(..., { shell: true })`, `os.system` или `Process.Start`.
- **XPath/LDAP/NoSQL**: Использование безопасных билдеров запросов.

### 1.2 Аутентификация и авторизация (Broken Access Control / IDOR)
- Проверяй права доступа (Tenant ID, User ID) на стороне сервера для **каждого** запроса:
  ```typescript
  // ✅ Проверка принадлежности сущности текущему пользователю
  const document = await db.documents.findFirst({
    where: { id: documentId, organizationId: currentUser.orgId }
  });
  if (!document) throw new NotFoundException();
  ```

### 1.3 Утечки секретов и конфиденциальных данных (PII / Secrets)
- Запрещено логировать токены, пароли, номера карт, персональные данные.
- Секреты загружаются строго через переменные окружения (`process.env`, `IConfiguration`, `os.environ`).
- Файлы `.env*`, `*.pem`, `*.key` должны быть в `.gitignore`.

### 1.4 SSRF (Server-Side Request Forgery)
- Валидируй внешние URL: запрещай запросы на локальные IP (`127.0.0.1`, `localhost`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254`).
- Используй allowlist разрешенных доменов.

### 1.5 XSS и безопасность заголовков
- Экранирование вывода в HTML.
- Настройка заголовков безопасности: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.

---

## 2. Команды аудита зависимостей

```bash
# Node.js
npm audit --omit=dev

# Python
pip-audit

# .NET
dotnet list package --vulnerable
```

---

## 3. Чек-лист безопасности (Security Gate)

- [ ] Все SQL/БД запросы параметризованы
- [ ] Все API эндпоинты проверяют авторизацию и IDOR (Tenant isolation)
- [ ] В коде нет хардкодных API ключей, паролей и токенов
- [ ] Логи не содержат чувствительных данных (PII, Auth headers)
- [ ] Внешние URL валидируются против SSRF
- [ ] Зависимости проверены на известные CVE
