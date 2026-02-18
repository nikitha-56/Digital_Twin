import os
from sqlalchemy.pool import StaticPool


from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+asyncpg://postgres:alekhya@localhost:5433/aquaculture_db"

engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    from sqlalchemy.pool import StaticPool
    import os

# Use SQLite with asyncio support
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./digital_twin.db")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    poolclass=StaticPool if "sqlite" in DATABASE_URL else None
)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_session():

    async with AsyncSessionLocal() as session:
        yield session
