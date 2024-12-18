from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from settings import settings

__all__ = [
    "session_maker",
]

engine = create_async_engine(settings.db.url, echo=False)
session_maker = async_sessionmaker(engine, expire_on_commit=False)
