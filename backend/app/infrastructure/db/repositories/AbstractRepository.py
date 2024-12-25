from abc import abstractmethod
from dataclasses import dataclass
from typing import Type

from sqlalchemy import select
from sqlalchemy.exc import NoResultFound, MultipleResultsFound
from sqlalchemy.ext.asyncio import async_sessionmaker

from abstractions.repositories import CRUDRepositoryInterface
from infrastructure.db.repositories.exceptions import NoFoundException


@dataclass
class AbstractSQLAlchemyRepository[Entity, Model, CreateDTO, UpdateDTO](
    CRUDRepositoryInterface[Model, CreateDTO, UpdateDTO]
):
    session_maker: async_sessionmaker

    def __post_init__(self):
        self.entity: Type[Entity] = self.__orig_bases__[0].__args__[0]

    async def create(self, obj: CreateDTO) -> None:
        async with self.session_maker() as session:
            async with session.begin():
                session.add(self.create_dto_to_entity(obj))

    async def get(self, obj_id: str) -> Model:
        async with self.session_maker() as session:
            try:
                res = await session.get(self.entity, obj_id)
                obj = res.scalars().one()
                return self.entity_to_model(obj)
            except NoResultFound:
                raise NoFoundException

    async def update(self, obj_id: str, obj: UpdateDTO) -> None:
        async with self.session_maker() as session:
            async with session.begin():
                entity = await session.get(self.entity, obj_id)
                for key, value in obj.model_dump(exculde_unset=True):
                    setattr(entity, key, value)

    async def delete(self, obj_id: str) -> None:
        async with self.session_maker() as session:
            async with session.begin():
                obj = await session.get(self.entity, obj_id)
                await session.delete(obj)

    async def get_all(self, limit: int = 100, offset: int = 0) -> list[Model]:
        async with self.session_maker() as session:
            return [
                self.entity_to_model(entity)
                for entity in (await session.execute(
                    select(self.entity)
                    .limit(limit)
                    .offset(offset)
                )).scalars().all()
            ]

    # TODO: возможно есть способ получше?
    #  меня бесит необходимость дублирования кода в разных репозиториях для вложенных сущностей
    @abstractmethod
    def entity_to_model(self, entity: Entity) -> Model:
        ...

    @abstractmethod
    def create_dto_to_entity(self, dto: CreateDTO) -> Entity:
        ...
