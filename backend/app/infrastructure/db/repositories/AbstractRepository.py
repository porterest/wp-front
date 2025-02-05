import logging
from abc import abstractmethod
from dataclasses import dataclass, field
from typing import Type, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import joinedload, InstrumentedAttribute

from abstractions.repositories import CRUDRepositoryInterface
from infrastructure.db.repositories.exceptions import NotFoundException

logger = logging.getLogger(__name__)


@dataclass
class AbstractSQLAlchemyRepository[Entity, Model, CreateDTO, UpdateDTO](
    CRUDRepositoryInterface[Model, CreateDTO, UpdateDTO]
):
    session_maker: async_sessionmaker

    joined_fields: dict[str, Optional[list[str]]] = field(default_factory=dict)
    options: list = field(default_factory=list)

    def __post_init__(self):
        self.entity: Type[Entity] = self.__orig_bases__[0].__args__[0]  # noqa
        self._set_lazy_fields()

    def _set_lazy_fields(self):
        if not self.joined_fields:
            return

        def convert_to_nested_dict(fields):
            return {field: {} for field in (fields or [])}

        def get_associated_entity_class(attr_field):
            """
            Extract the associated entity class from an InstrumentedAttribute.
            """
            if hasattr(attr_field, "comparator") and hasattr(attr_field.comparator, "prop"):
                relationship_prop = attr_field.comparator.prop
                if hasattr(relationship_prop, "mapper"):
                    return relationship_prop.mapper.entity
            return None

        def build_joinedload(attr_field, subfields, depth=0):
            """
            Recursively build joinedload options for nested relationships.
            """
            associated_entity = get_associated_entity_class(attr_field)
            if not associated_entity:
                raise ValueError(f"Cannot determine associated entity class for attribute {attr_field}")

            loader = joinedload(attr_field)
            for subfield, nested_subfields in subfields.items():
                nested_attr_field = getattr(associated_entity, subfield, None)
                if nested_attr_field is None:
                    raise ValueError(f"{subfield} is not a valid attribute of {associated_entity}")

                subloader = build_joinedload(nested_attr_field, nested_subfields, depth + 1)
                loader = loader.options(subloader)
            return loader

        # Convert self.joined_fields to nested dictionaries if not already
        joined_fields = {}
        for field in self.joined_fields:
            joined_fields[field] = convert_to_nested_dict(self.joined_fields[field])

        options_to_add = []
        for attr, subfields in joined_fields.items():
            attr_field: InstrumentedAttribute = getattr(self.entity, attr)
            if attr_field.comparator.prop.uselist:
                loader = build_joinedload(attr_field, subfields or {})
                options_to_add.append(loader)
            else:
                options_to_add.append(joinedload(attr_field))

        self.options.extend(options_to_add)

    async def create(self, obj: CreateDTO) -> None:
        async with self.session_maker() as session:
            async with session.begin():
                session.add(self.create_dto_to_entity(obj))

    async def get(self, obj_id: str) -> Model:
        async with self.session_maker() as session:
            try:
                if self.options:
                    res = await session.execute(
                        select(self.entity)
                        .where(self.entity.id == obj_id)
                        .options(*self.options)
                    )
                    obj = res.unique().scalars().one()
                else:
                    obj = await session.get(self.entity, obj_id)
                return self.entity_to_model(obj)
            except NoResultFound:
                raise NotFoundException

    async def update(self, obj_id: str, obj: UpdateDTO) -> None:
        async with self.session_maker() as session:
            async with session.begin():
                entity = await session.get(self.entity, obj_id)
                for key, value in obj.model_dump(exclude_unset=True).items():
                    setattr(entity, key, value)

    async def delete(self, obj_id: str) -> None:
        async with self.session_maker() as session:
            async with session.begin():
                obj = await session.get(self.entity, obj_id)
                await session.delete(obj)

    async def get_all(self, limit: int = 100, offset: int = 0, joined: bool = True) -> list[Model]:
        async with self.session_maker() as session:
            if joined:
                if self.options:
                    return [
                        self.entity_to_model(entity)
                        for entity in (await session.execute(
                            select(self.entity)
                            .limit(limit)
                            .offset(offset)
                            .options(*self.options)
                        )).unique().scalars().all()
                    ]
            res = (await session.execute(
                select(self.entity)
                .limit(limit)
                .offset(offset)
            )).scalars().all()
            return [
                self.entity_to_model(entity)
                for entity in res
            ]

    # TODO: возможно есть способ получше?
    #  меня бесит необходимость дублирования кода в разных репозиториях для вложенных сущностей
    @abstractmethod
    def entity_to_model(self, entity: Entity) -> Model:
        ...

    @abstractmethod
    def create_dto_to_entity(self, dto: CreateDTO) -> Entity:
        ...
