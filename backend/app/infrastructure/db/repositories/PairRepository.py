from dataclasses import field, dataclass
from typing import Optional
from uuid import UUID

from sqlalchemy import select

from abstractions.repositories.pair import PairRepositoryInterface
from domain.dto.pair import CreatePairDTO, UpdatePairDTO
from domain.models.pair import Pair as PairModel
from infrastructure.db.entities import Pair, Block, Chain
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


@dataclass
class PairRepository(
    AbstractSQLAlchemyRepository[Pair, PairModel, CreatePairDTO, UpdatePairDTO],
    PairRepositoryInterface,
):
    # joined_fields: list[str] = field(default_factory=lambda: ['bets'])
    joined_fields: dict[str, Optional[list[str]]] = field(
        default_factory=lambda: {
            'bets': None,
        }
    )

    async def get_block_pair(self, block_id: UUID) -> Pair:
        async with self.session_maker() as session:
            block_res = await session.execute(
                select(Block)
                .where(Block.id == block_id)
            )
            block: Block = block_res.scalars().one()

            chain_res = await session.execute(
                select(Chain)
                .where(Chain.id == block.chain_id)
            )
            chain: Chain = chain_res.scalars().one()

            res = await session.execute(
                select(self.entity)
                .where(self.entity.id == chain.pair_id)
                .options(*self.options)
            )
            pair = res.unique().scalar_one()
            return self.entity_to_model(pair)

    async def get_pair_by_tokens(self, token1: str, token2: str) -> Pair:
        async with self.session_maker() as session:
            res = await session.execute(
                select(self.entity)
                .where(
                    token1 in self.entity.name,
                    token2 in self.entity.name,
                )
                .options(*self.options)
            )
            pair = res.unique().scalar_one()
            return self.entity_to_model(pair)

    def create_dto_to_entity(self, dto: CreatePairDTO) -> Pair:
        return Pair(
            id=dto.id,
            name=dto.name,
            contract_address=dto.contract_address,
            last_ratio=dto.last_ratio,
        )

    def entity_to_model(self, entity: Pair) -> PairModel:
        return PairModel(
            id=entity.id,
            name=entity.name,
            last_ratio=entity.last_ratio,
            contract_address=entity.contract_address,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
