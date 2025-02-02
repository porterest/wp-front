import logging
from dataclasses import dataclass, field
from typing import Optional
from uuid import UUID

from sqlalchemy import select, desc, and_

from abstractions.repositories.block import BlockRepositoryInterface
from domain.dto.block import CreateBlockDTO, UpdateBlockDTO
from domain.enums.block_status import BlockStatus
from domain.models.bet import Bet as BetModel
from domain.models.block import Block as BlockModel
from domain.models.pair import Pair as PairModel
from infrastructure.db.entities import Block, Pair, Chain
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository

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
            )
            target = res.scalars().one()

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
                    self.entity.status == BlockStatus.COMPLETED
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

            logger.info("ебаная пара")
            logger.info(pair)

            chain = (await session.execute(
                select(Chain)
                .where(Chain.pair_id == pair.id)
            )).scalars().one()

            logger.info("ебаный чейн")
            logger.info(chain)

            res = await session.execute(
                select(self.entity)
                .where(self.entity.chain_id == chain.id, self.entity.status == 'COMPLETED')
                .order_by(desc(self.entity.created_at, ))
                .limit(1)
                .options(*self.options),
            )

            block = res.unique().scalars().one_or_none()
            logger.info('ебаный блок')
            logger.info(block)

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
