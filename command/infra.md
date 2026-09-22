---
description: Быстрая генерация инфраструктурных конфигов (Docker, Compose, Nginx, CI/CD, K8s)
---

# Infra Command | Команда /infra

## Назначение
Мгновенно сгенерировать или обновить конфигурацию инфраструктуры под выбранный стек проекта с лучшими практиками безопасности (multi-stage, non-root, caching).

## Вход
- `/infra <сервисы/окружение>` (например `/infra docker-compose postgres redis nginx` или `/infra github-actions matrix-build`)
- `/infra` без аргументов — анализ проекта и предложение оптимального инфраструктурного набора

## Автоматический режим
1. Исследовать кодовую базу (определить стек: Node.js / .NET / Python / Go).
2. Загрузить агента `devops` и навык `devops-docker`.
3. Создать необходимые файлы:
   - `Dockerfile` (с multi-stage сборкой и non-root пользователем)
   - `docker-compose.yml` (с volume persistance, healthchecks и сетями)
   - `.env.example` (с шаблонами переменных окружения)
   - `.dockerignore` (с исключением `node_modules`, `.git`, `.env`)
4. Проверить корректность конфигураций.

## Пример вывода
```
## 🚢 Инфраструктура настроена

Созданные файлы:
- `Dockerfile` (Multi-stage Node.js 20 Alpine, USER node)
- `docker-compose.yml` (App + PostgreSQL 16 + Redis 7 + Adminer)
- `.dockerignore`
- `.env.example`

Команда для локального запуска:
```bash
docker compose up --build -d
```
```
