from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Callable, AsyncContextManager

from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from abstractions.repositories import UOWInterface
from infrastructure.repositories.sqlalchemy.AbstractRepository import AbstractSQLAlchemyRepository


@dataclass
class AbstractSQLAlchemyUOW(
    UOWInterface
):
    session_maker: async_sessionmaker
    _session = None
    _repositories = []

    class FakeSession:
        def __init__(self, session):
            self._session = session

        async def close(self):
            pass

        async def commit(self):
            pass

        async def rollback(self):
            pass

        def begin(self):
            return self

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            return False

        def __getattr__(self, item):
            try:
                return self._session.__getattribute__(item)
            except AttributeError:
                return self.__getattribute__(item)

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()

    @classmethod
    def create_fake_session_maker(cls, session) -> Callable[[None], AsyncContextManager[AsyncSession]]:
        @asynccontextmanager
        async def session_maker():
            yield cls.FakeSession(session=session)

        return session_maker

    async def attach(self, *repositories: AbstractSQLAlchemyRepository) -> 'AbstractSQLAlchemyUOW':
        self._repositories = repositories
        return self

    async def __aenter__(self) -> 'AbstractSQLAlchemyUOW':
        self._session = self.session_maker()
        session_maker = self.create_fake_session_maker(self._session)
        for repository in self._repositories:
            repository.session_maker = session_maker
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            await self.rollback()
        else:
            await self.commit()
        await self._session.close()
        self._session = None
        self._repositories = []
        return False
