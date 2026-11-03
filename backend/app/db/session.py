from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings

# Parse and normalize database URL
connect_args = {}
db_url = settings.DATABASE_URL

if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}
elif "postgresql" in db_url:
    # Ensure async driver
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    # Strip libpq-specific query params that conflict with asyncpg
    if "?" in db_url:
        db_url = db_url.split("?", 1)[0]
    connect_args = {"ssl": "require"}

engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    future=True,
    connect_args=connect_args,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
