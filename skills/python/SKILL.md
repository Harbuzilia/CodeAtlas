---
name: python
description: "Python 3.11+ паттерны: type hints везде, Pydantic v2, async I/O (httpx, AsyncSession), FastAPI routers → services → repositories, SQLAlchemy 2.0 (Mapped[T], selectinload), без bare except"
---

# Python Skill

> **Context7**: API детали — через `context7_get_library_docs` (FastAPI, Django, SQLAlchemy, Pydantic). Этот файл — паттерны, не справочник.

## Когда использовать

Python 3.11+ | FastAPI/Django/Flask | SQLAlchemy 2.x | Pydantic v2 | pytest | ruff + mypy

---

## Обязательный протокол

- Сначала минимальный безопасный план; меняй только нужное.
- Явные границы слоёв: router → service → repository.
- Изменение API-контракта → тесты + docs-sync.

## Требования

- **Type hints на всех функциях**; `X | None` синтаксис (3.10+), не `Optional[X]`.
- **Pydantic v2** для validation входных данных; `model_config = {"from_attributes": True}` для ORM-моделей.
- **Async для всех I/O** (httpx AsyncClient, AsyncSession); конкурентные запросы через `asyncio.gather`.
- Нет bare `except:` — только конкретные exceptions.
- Большие коллекции — генераторы (`yield`), не списки в памяти; чистые дорогие функции — `functools.lru_cache`.

## FastAPI

- Структура: `routers/` (transport) → `services/` (логика) → `repositories/` (data access) → `models/` + `schemas/`.
- DI через `Depends`; сессия БД — async generator dependency (`yield session`).
- Доменные ошибки — custom exception + `@app.exception_handler` → правильный HTTP status.

## SQLAlchemy 2.0

- Models: `Mapped[T]` + `mapped_column`, relationships с `back_populates`.
- Запросы: `select()` + `await db.execute(...)`; eager loading — `selectinload` (не N+1).

## pytest

- Async тесты: `@pytest.mark.asyncio`; HTTP — `AsyncClient(transport=ASGITransport(app=app))`.
- Тестовые данные — fixtures, не setup-код в тестах.

## Tooling (если есть в проекте)

`ruff check . && ruff format . && mypy . && pytest -q` — quality gate. Отсутствующий tooling не добавлять без запроса.

## Чек-лист перед коммитом

- [ ] Type hints везде, Pydantic v2 на входах
- [ ] Async для I/O, нет bare except
- [ ] Границы слоёв соблюдены
- [ ] Нет N+1 (selectinload/join)
- [ ] API change → тесты + docs обновлены
- [ ] Для prod изменений указан rollback/mitigation план
