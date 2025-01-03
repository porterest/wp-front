from dataclasses import dataclass, field
from typing import Optional
from uuid import UUID

from sqlalchemy import select, desc

from abstractions.repositories.block import BlockRepositoryInterface
from domain.dto.block import CreateBlockDTO, UpdateBlockDTO
from domain.models.block import Block as BlockModel
from infrastructure.db.entities import Block, Pair, Chain
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


@dataclass
class BlockRepository(
    AbstractSQLAlchemyRepository[Block, BlockModel, CreateBlockDTO, UpdateBlockDTO],
    BlockRepositoryInterface
):
    # joined_fields: list[str] = field(default_factory=lambda: ['bets', 'chain'])
    joined_fields: dict[str, Optional[list[str]]] = field(
        default_factory=lambda: {
            'chain': None,
        }
    )
    async def get_last_block(self, chain_id) -> Optional[Block]:
        async with self.session_maker() as session:
            res = await session.execute(
                select(self.entity).where(self.entity.chain_id == chain_id).order_by(
                    desc(self.entity.block_number, )).limit(1),
            )

            block = res.scalars().one_or_none()
        return self.entity_to_model(block) if block else None

    async def get_last_block_by_pair_id(self, pair_id: UUID) -> Optional[Block]:
        async with self.session_maker() as session:
            pair = (await session.execute(
                select(Pair)
                .where(Pair.id == pair_id)
            )).scalars().one()

            chain = (await session.execute(
                select(Chain)
                .where(Chain.pair_id == pair.id)
            )).scalars().one()

            res = await session.execute(
                select(self.entity).where(self.entity.chain_id == chain.id).order_by(
                    desc(self.entity.block_number, )).limit(1),
            )

            block = res.scalars().one_or_none()
        return self.entity_to_model(block) if block else None

    async def get(self, block_id: UUID) -> Optional[Block]:
        try:
            return await super().get(block_id)
        except:
            return None

    def create_dto_to_entity(self, dto: CreateBlockDTO) -> Block:
        return Block(
            id=dto.id,
            block_number=dto.block_number,
            status=dto.status,
            chain_id=dto.chain_id,
            result_vector=dto.result_vector,
            created_at=dto.created_at,
            completed_at=dto.completed_at,
        )

    def entity_to_model(self, entity: Block) -> BlockModel:
        return BlockModel(
            id=entity.id,
            block_number=entity.block_number,
            chain_id=entity.chain_id,
            status=entity.status,
            result_vector=entity.result_vector,
            created_at=entity.created_at,
            completed_at=entity.completed_at,
            updated_at=entity.updated_at
        )
