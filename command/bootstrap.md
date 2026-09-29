---
description: Однокликовый бутстраппинг боевой инфраструктуры (Multi-stage Docker, Compose, Telemetry, Health endpoints)
---

# Bootstrap Command | Команда /bootstrap

## Назначение
Превратить любой сырой проект в готовый к продакшену стек за 1 секунду:
1. Multi-stage `Dockerfile` (с non-root безопасностью и минимальным образом).
2. `docker-compose.yml` (PostgreSQL, Redis, OpenTelemetry Collector, Prometheus, Grafana).
3. Health check эндпоинты (`/healthz`, `/readyz`, `/livez`).
4. GitHub Actions CI/CD пайплайн.

## Вход
- `/bootstrap` — генерация инфраструктуры для проекта
- `/bootstrap <стек>` (например, `/bootstrap node-postgres` или `/bootstrap dotnet-redis`)

## Пример вывода
```
====================================================
     🚢 OPENCODE PRODUCTION BOOTSTRAPPER            
====================================================

✅ Generated Multi-stage Dockerfile (Non-root user, Alpine base)
✅ Generated docker-compose.prod.yml (App + PostgreSQL + Redis + Telemetry)
✅ Generated Health Check Routes (/healthz, /readyz)
✅ Generated GitHub Actions CI/CD Pipeline (.github/workflows/deploy.yml)

🎉 Project is 100% Production Ready for Docker, Kubernetes and Cloud!
====================================================
```
