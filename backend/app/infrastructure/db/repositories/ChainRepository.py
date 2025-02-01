from dataclasses import field, dataclass
from typing import Optional
from uuid import UUID

from sqlalchemy import select

from abstractions.repositories.chain import ChainRepositoryInterface
from domain.dto.chain import CreateChainDTO, UpdateChainDTO
from domain.models.chain import Chain as ChainModel
from domain.models.pair import Pair as PairModel
from infrastructure.db.entities import Chain
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


@dataclass
class ChainRepository(
    AbstractSQLAlchemyRepository[Chain, ChainModel, CreateChainDTO, UpdateChainDTO],
    ChainRepositoryInterface
):
    joined_fields: dict[str, Optional[list[str]]] = field(
        default_factory=lambda: {
            'blocks': None,
            'pair': None,
        }
    )

    async def get_by_pair_id(self, pair_id: UUID) -> Chain:
        async with self.session_maker() as session:
            if self.options:
                res = await session.execute(
                    select(self.entity)
                    .where(
                        self.entity.pair_id == pair_id,
                    )
                    .options(*self.options)
                )
                res = res.unique()
            else:
                res = await session.execute(
                    select(self.entity).where(self.entity.pair_id == pair_id)
                )
            chain = res.unique().scalars().one_or_none()
        return self.entity_to_model(chain) if chain else None

    def create_dto_to_entity(self, dto: CreateChainDTO) -> Chain:
        return Chain(
            id=dto.id,
            current_block=dto.current_block,
            pair_id=dto.pair_id,
            created_at=dto.created_at,
            status=dto.status
        )

    def entity_to_model(self, entity: Chain) -> ChainModel:
        return ChainModel(
            id=entity.id,
            current_block=entity.current_block,
            pair_id=entity.pair_id,
            pair=PairModel(
                id=entity.pair.id,
                name=entity.pair.name,
                contract_address=entity.pair.contract_address,
                created_at=entity.pair.created_at,
                updated_at=entity.pair.updated_at,
            ),
            created_at=entity.created_at,
            status=entity.status,
            updated_at=entity.updated_at
        )
