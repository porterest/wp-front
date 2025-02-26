import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, desc, and_
from abstractions.repositories.block import BlockRepositoryInterface
from domain.dto.block import CreateBlockDTO, UpdateBlockDTO
from domain.enums.block_status import BlockStatus
from domain.metaholder.responses.block_state import BlockStateResponse
from domain.models.bet import Bet as BetModel
from domain.models.block import Block as BlockModel
from domain.models.pair import Pair as PairModel
from infrastructure.db.entities import Block, Pair, Chain
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository
from infrastructure.db.repositories.exceptions import NotFoundException

logger = logging.getLogger(__name__)


@dataclass
class BlockRepository(
    AbstractSQLAlchemyRepository[Block, BlockModel, CreateBlockDTO, UpdateBlockDTO],
    BlockRepositoryInterface
):
    joined_fields: dict[str, Optional[list[str]]] = field(
        default_factory=lambda: {
            'chain': None,
            'bets': ['pair']
        }
    )
    block_generation_interval: timedelta = timedelta(minutes=10)


    async def get_last_block_by_contract_address(self, contract_address: str) -> Optional[Block]:
        async with self.session_maker() as session:
            pair = await session.execute(
                select(Pair)
                .where(Pair.contract_address == contract_address)
            )
            pair = pair.scalars().one()

            chain = await session.execute(
                select(Chain)
                .where(Chain.pair_id == pair.id)
            )
            chain = chain.scalars().one()

            res = await session.execute(
                select(self.entity)
                .where(
                    self.entity.chain_id == chain.id,
                    self.entity.status == BlockStatus.COMPLETED,
                )
                .order_by(desc(self.entity.created_at))
                .limit(1)
                .options(*self.options)
            )
            block = res.unique().scalars().one_or_none()

        return self.entity_to_model(block) if block else None

    async def get_previous_block(self, block: Block) -> Block:
        async with self.session_maker() as session:
            res = await session.execute(
                select(self.entity)
                .where(
                    self.entity.chain_id == block.chain_id,
                    self.entity.status == BlockStatus.COMPLETED,
                    self.entity.block_number < block.block_number
                )
                .order_by(
                    self.entity.created_at.desc(),
                )
                .limit(1)
                .options(*self.options)
            )
            target = res.unique().scalars().one()

        return self.entity_to_model(target)

    async def get_last_completed_block(self, chain_id: UUID) -> Optional[Block]:
        async with self.session_maker() as session:
            res = await session.execute(
                select(self.entity)
                .where(
                    self.entity.chain_id == chain_id,
                    self.entity.status == BlockStatus.COMPLETED,
                )
                .order_by(desc(self.entity.created_at, ))
                .limit(1)
                .options(*self.options)
            )

            block = res.unique().scalars().one_or_none()
        return self.entity_to_model(block) if block else None

    async def get_last_block(self, chain_id: UUID) -> Optional[Block]:
        async with self.session_maker() as session:
            res = await session.execute(
                select(self.entity)
                .where(self.entity.chain_id == chain_id)
                .order_by(
                    desc(self.entity.created_at, ))
                .limit(1)
                .options(*self.options)
            )

            block = res.unique().scalars().one_or_none()
        return self.entity_to_model(block) if block else None

    async def get_n_last_active_blocks_by_pair_id(self, n: int, pair_id: str) -> Optional[list[Block]]:
        async with self.session_maker() as session:
            chain_res = await session.execute(
                select(Chain)
                .where(Chain.pair_id == pair_id)
            )
            chain: Chain = chain_res.scalars().one()

            res = await session.execute(
                select(self.entity)
                .where(and_(
                    self.entity.chain_id == chain.id,
                    self.entity.result_vector != [0.0, 0.0],
                    self.entity.status == BlockStatus.COMPLETED,
                    # self.entity.bets.any()
                ))
                .order_by(desc(self.entity.created_at, ))
                .limit(n)
                .options(*self.options),
            )

            blocks = res.unique().scalars().all()
        return [self.entity_to_model(block) for block in blocks] if blocks else None

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
                select(self.entity)
                .where(self.entity.chain_id == chain.id)
                .order_by(desc(self.entity.created_at, ))
                .limit(1)
                .options(*self.options),
            )

            block = res.unique().scalars().one_or_none()
        return self.entity_to_model(block) if block else None

    async def get_last_completed_block_by_pair_id(self, pair_id: UUID) -> Optional[Block]:
        logger.info(pair_id)
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
                select(self.entity)
                .where(
                    self.entity.chain_id == chain.id,
                    self.entity.status == 'COMPLETED',
                )
                .order_by(desc(self.entity.created_at, ))
                .limit(1)
                .options(*self.options),
            )

            block = res.unique().scalars().one_or_none()

        return self.entity_to_model(block) if block else None

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
            bets=[BetModel(
                id=bet.id,
                status=bet.status,
                vector=bet.vector,
                amount=bet.amount,
                block_number=entity.block_number,
                user_id=bet.user_id,
                reward=bet.reward,
                accuracy=bet.accuracy,
                created_at=bet.created_at,
                updated_at=bet.updated_at,
                pair=PairModel(
                    id=bet.pair.id,
                    name=bet.pair.name,
                    created_at=bet.pair.created_at,
                    updated_at=bet.pair.updated_at,
                )
            ) for bet in entity.bets] if entity.bets else [],
            completed_at=entity.completed_at,
            updated_at=entity.updated_at,
        )

    async def get_current_block_state(self, pair_id: UUID) -> BlockStateResponse:
        """
        Возвращает текущее состояние блока, включая таймер для фронтенда.
        """
        last_block = await self.get_last_block_by_pair_id(pair_id)
        if not last_block:
            raise NotFoundException
        elapsed_time = (datetime.now() - last_block.created_at).total_seconds()
        remaining_time = max(0.0, self.block_generation_interval.total_seconds() - elapsed_time)

        return BlockStateResponse(
            block_id=last_block.id,
            server_time=str(datetime.now()),
            current_block=last_block.block_number,
            remaining_time_in_block=int(remaining_time),
        )

