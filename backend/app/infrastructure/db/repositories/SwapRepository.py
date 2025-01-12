from dataclasses import field, dataclass
from typing import Optional
from uuid import UUID

from sqlalchemy import select, desc

from abstractions.repositories.swap import SwapRepositoryInterface
from domain.dto.swap import CreateSwapDTO, UpdateSwapDTO
from domain.models.swap import Swap as SwapModel
from infrastructure.db.entities import Swap, Chain, Block
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


@dataclass
class SwapRepository(
    AbstractSQLAlchemyRepository[Swap, SwapModel, CreateSwapDTO, UpdateSwapDTO],
    SwapRepositoryInterface
):
    async def get_last_swaps_for_chain(self, chain_id: UUID, amount: int = 10) -> list[Swap]:
        async with self.session_maker() as session:
            chain_res = await session.execute(
                select(Chain)
                .where(Chain.id == chain_id)
            )
            chain: Chain = chain_res.scalars().one()

            blocks_res = await session.execute(
                select(Block)
                .where(Block.chain_id == chain.id)
                .order_by(desc(Block.created_at))
                .limit(amount)
            )
            blocks = blocks_res.scalars().all()
            block_ids = [block.id for block in blocks]

            res = await session.execute(
                select(self.entity)
                .where(self.entity.block_id in block_ids)
                .limit(10)
                .options(*self.options)
            )

            swaps = res.unique().scalars().all()
        return [self.entity_to_model(swap) for swap in swaps] if swaps else None

    # async def get_system_reserve(self):
    #     return 123
    #
    # async def get_total_swap_volume(self):
    #     return 123
    #
    # async def get_current_liquidity(self):
    #     return 134

    async def get_by_block_id(self, block_id: UUID) -> Swap:
        async with self.session_maker() as session:
            res = await session.execute(
                select(self.entity)
                .where(self.entity.block_id == block_id)
                .options(*self.options)
            )

            swap = res.unique().scalars().one_or_none()
        return self.entity_to_model(swap) if swap else None

    # joined_fields: list[str] = field(default_factory=lambda: ['user'])
    joined_fields: dict[str, Optional[list[str]]] = field(
        default_factory=lambda: {
            'block': None,
        }
    )

    def create_dto_to_entity(self, dto: CreateSwapDTO) -> Swap:
        return Swap(
            id=dto.id,
            block_id=dto.block.id,
            block=dto.block,
            target_price=dto.target_price,
            amount=dto.amount,
        )

    def entity_to_model(self, entity: Swap) -> SwapModel:
        return SwapModel(
            id=entity.id,
            block=entity.block,
            target_price=entity.target_price,
            amount=entity.amount,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )
