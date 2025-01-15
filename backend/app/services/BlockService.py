import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from abstractions.repositories.block import BlockRepositoryInterface
from abstractions.repositories.chain import ChainRepositoryInterface
from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.bet import BetServiceInterface
from abstractions.services.block import BlockServiceInterface
from abstractions.services.math.aggregate_bets import AggregateBetsServiceInterface
from domain.dto.bet import CreateBetDTO
from domain.dto.block import UpdateBlockDTO, CreateBlockDTO
from domain.enums import BetStatus
from domain.enums.block_status import BlockStatus
from domain.models.block import Block
from infrastructure.db.repositories.exceptions import NotFoundException as RepositoryNotFoundException
from services.exceptions import NotFoundException

logger = logging.getLogger(__name__)


@dataclass
class BlockService(BlockServiceInterface):
    block_repository: BlockRepositoryInterface
    bet_service: BetServiceInterface
    aggregate_bets_service: AggregateBetsServiceInterface
    chain_repository: ChainRepositoryInterface
    user_repository: UserRepositoryInterface

    async def create(self, create_dto):
        await self.block_repository.create(create_dto)

    async def get(self, block_id: UUID) -> Block:
        return await self.block_repository.get(block_id)

    async def get_last_block(self, chain_id: UUID) -> Optional[Block]:
        last_block = await self.block_repository.get_last_block(chain_id)
        return last_block

    async def get_n_last_blocks_by_pair_id(self, n: int, pair_id: UUID) -> Optional[list[Block]]:
        last_blocks = await self.block_repository.get_n_last_blocks_by_pair_id(n, pair_id)
        return last_blocks

    async def get_last_block_by_pair_id(self, pair_id: UUID) -> Optional[Block]:
        last_block = await self.block_repository.get_last_block_by_pair_id(pair_id)
        return last_block

    async def get_last_completed_block_by_pair_id(self, pair_id: UUID) -> Optional[Block]:
        last_block = await self.block_repository.get_last_completed_block_by_pair_id(pair_id)
        return last_block

    async def handle_interrupted_block(self, block_id: UUID) -> None:
        update_block = UpdateBlockDTO(
            status=BlockStatus.INTERRUPTED,
        )
        logger.info('begin handle_interrupted_block')
        await self.block_repository.update(block_id, update_block)
        logger.info(update_block)
        block = await self.block_repository.get(block_id)
        logger.info(block)
        # Отменяем ставки в прерванном блоке
        for bet in block.bets:
            logger.info(f'нахуй эту ставку {bet}')
            await self.bet_service.cancel_bet(bet.id)
            logger.info(f'{bet} в жопе')

    async def start_new_block(self, chain_id: UUID) -> Block:
        last_block = await self.block_repository.get_last_completed_block(chain_id)
        logger.info(f'last completed block is {last_block.id} ({last_block.status})')
        if last_block:
            block = CreateBlockDTO(
                block_number=last_block.block_number + 1,
                status=BlockStatus.IN_PROGRESS,
                result_vector=None,
                chain_id=chain_id,
                created_at=datetime.now(),
            )
        else:
            block = CreateBlockDTO(
                block_number=1,
                status=BlockStatus.IN_PROGRESS,
                result_vector=None,
                chain_id=chain_id,
                created_at=datetime.now(),
            )

        await self.block_repository.create(block)
        block = await self.block_repository.get(block.id)
        return block

    async def complete_block(self, block_id: UUID) -> None:
        block = await self.get_block(block_id)
        result_vector = await self.aggregate_bets_service.aggregate_bets(block_id)
        update_block = (
            UpdateBlockDTO(
                status=BlockStatus.COMPLETED,
                result_vector=result_vector,
                completed_at=datetime.now(),
            )
        )
        block.status = BlockStatus.COMPLETED
        block.completed_at = datetime.now()
        await self.block_repository.update(block_id, update_block)

        chain = await self.chain_repository.get(block.chain_id)
        for bet in block.bets:
            user = await self.user_repository.get(bet.user_id)
            if user.balance > bet.amount:
                new_bet = CreateBetDTO(
                    user_id=bet.user_id,
                    pair_id=chain.pair_id,
                    amount=bet.amount,
                    block_id=block_id,
                    vector=bet.vector,
                    status=BetStatus.PENDING
                )
                await self.bet_service.create_bet(new_bet)

    async def get_block(self, block_id: UUID) -> Block:
        try:
            block = await self.block_repository.get(block_id)
        except RepositoryNotFoundException:
            raise NotFoundException(f"Block with ID {block_id} not found")
        return block

    async def rollback_block(self, block: Block) -> None:
        # Implement rollback logic here
        update_block = UpdateBlockDTO(
            status=BlockStatus.COMPLETED,
            result_vector=block.result_vector,
            completed_at=None,
        )
        block.status = BlockStatus.COMPLETED
        await self.block_repository.update(block.id, update_block)
