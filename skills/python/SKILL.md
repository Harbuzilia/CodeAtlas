---
name: python
description: python skill reference
---

# Python Skill

> **Context7**: Для API деталей — используй `context7_get_library_docs` для FastAPI, Django, SQLAlchemy, Pydantic.
> Этот файл — **паттерны и архитектура**, не справочник по API.

---

## Когда использовать

Загружай этот скилл при работе с:
- Python 3.11+
- FastAPI / Django / Flask
- SQLAlchemy 2.x
- Pydantic v2
- pytest
- ruff + mypy (если доступны в проекте)

---

## Python Best Practices

### Human-grade protocol (обязательно)
- Сначала описывай минимальный безопасный план изменений.
- Меняй только то, что нужно для задачи.
- Явно отделяй бизнес-логику, инфраструктуру и транспортный слой.
- Любое изменение контракта API сопровождай тестами и docs-sync.

### Type Hints везде

```python
# ✅ Полная типизация
from typing import Optional, List
from datetime import datetime

def get_user(user_id: int) -> Optional[User]:
    """Получает пользователя по ID."""
    return db.query(User).get(user_id)

def get_active_users(limit: int = 10) -> List[User]:
    """Получает активных пользователей."""
    return db.query(User).filter(User.is_active).limit(limit).all()
```

### Dataclasses / Pydantic

```python
# ✅ Pydantic v2 для validation
from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    age: int = Field(..., ge=0, le=150)

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    
    model_config = {"from_attributes": True}  # для ORM
```

### Async/Await

```python
# ✅ Async для I/O операций
import asyncio
from httpx import AsyncClient

async def fetch_user(client: AsyncClient, user_id: int) -> dict:
    response = await client.get(f"/users/{user_id}")
    response.raise_for_status()
    return response.json()

async def fetch_all_users(user_ids: list[int]) -> list[dict]:
    async with AsyncClient(base_url="https://api.example.com") as client:
        tasks = [fetch_user(client, uid) for uid in user_ids]
        return await asyncio.gather(*tasks)
```

### Производительность (Performance)

- **Генераторы (Generators)**: При работе с большими коллекциями данных ВСЕГДА используй генераторы (`yield` или `(x for x in data)`) вместо загрузки всего списка в память.
- **List Comprehensions**: Предпочитай списковые включения вместо циклов `for` с `append()` для инициализации списков.
- **Cashing**: Используй `functools.lru_cache` или `async_lru` для кеширования вычислительно сложных и чистых функций.

---

## FastAPI Patterns

### Структура проекта

```
app/
├── main.py           # FastAPI app
├── config.py         # Settings
├── models/           # SQLAlchemy models
├── schemas/          # Pydantic schemas
├── routers/          # API endpoints
├── services/         # Business logic
├── repositories/     # Data access
└── tests/
```

### Dependency Injection

```python
# ✅ Dependencies для DRY
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    user = await verify_token(token, db)
    if not user:
        raise HTTPException(status_code=401)
    return user

@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return user
```

### Error Handling

```python
# ✅ Custom exceptions
class UserNotFoundError(Exception):
    def __init__(self, user_id: int):
        self.user_id = user_id

@app.exception_handler(UserNotFoundError)
async def user_not_found_handler(request: Request, exc: UserNotFoundError):
    return JSONResponse(
        status_code=404,
        content={"detail": f"User {exc.user_id} not found"}
    )
```

---

## SQLAlchemy 2.0

### Models

```python
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(256), unique=True)
    
    posts: Mapped[list["Post"]] = relationship(back_populates="author")
```

### Async Queries

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()

async def get_users_with_posts(db: AsyncSession) -> list[User]:
    result = await db.execute(
        select(User).options(selectinload(User.posts))
    )
    return result.scalars().all()
```

---

## pytest

### Fixtures

```python
import pytest
from httpx import AsyncClient, ASGITransport

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

@pytest.fixture
async def test_user(db: AsyncSession):
    user = User(name="Test", email="test@example.com")
    db.add(user)
    await db.commit()
    return user
```

### Tests

```python
@pytest.mark.asyncio
async def test_create_user(client: AsyncClient):
    response = await client.post("/users", json={
        "name": "John",
        "email": "john@example.com",
        "age": 25
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "John"
    assert "id" in data
```

---

## Modern Tooling (если есть в проекте)

```bash
ruff check .
ruff format .
mypy .
pytest -q
```

- Если tooling отсутствует, не добавляй его автоматически без запроса.
- Если tooling есть, используй его как основной gate качества.

## Чек-лист перед коммитом

- [ ] Type hints на всех функциях
- [ ] Pydantic v2 для validation входных данных
- [ ] Async для всех I/O операций
- [ ] Здоровые границы слоев (router/service/repository)
- [ ] pytest fixtures для тестовых данных
- [ ] Нет bare `except:` - только конкретные exceptions
- [ ] Документация API обновлена при изменении контракта
- [ ] Для production изменений указан rollback/mitigation план
