from sqlalchemy.ext.asyncio import async_sessionmaker

from infrastructure.db import session_maker


def get_session_maker() -> async_sessionmaker:
    return session_maker
