import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from abstractions.repositories.bet import BetRepositoryInterface
from abstractions.repositories.block import BlockRepositoryInterface
from abstractions.repositories.chain import ChainRepositoryInterface
from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.bet import BetServiceInterface
from abstractions.services.block import BlockServiceInterface
from abstractions.services.math.aggregate_bets import AggregateBetsServiceInterface
from domain.dto.bet import UpdateBetDTO
from domain.dto.block import UpdateBlockDTO, CreateBlockDTO
from domain.enums import BetStatus
from domain.enums.block_status import BlockStatus
from domain.metaholder.requests.bet import PlaceBetRequest
from domain.metaholder.responses.block_state import BlockStateResponse
from domain.models.block import Block
from domain.models.reward_model import Rewards
from infrastructure.db.repositories.exceptions import NotFoundException as RepositoryNotFoundException
from services.exceptions import NotFoundException

logger = logging.getLogger(__name__)


@dataclass
class BlockService(BlockServiceInterface):
    block_repository: BlockRepositoryInterface
    aggregate_bets_service: AggregateBetsServiceInterface
    chain_repository: ChainRepositoryInterface
    user_repository: UserRepositoryInterface
    bet_repository: BetRepositoryInterface
    bet_service: BetServiceInterface

    async def get_last_block(self, chain_id: UUID) -> Optional[Block]:
        last_block = await self.block_repository.get_last_block(chain_id)
        return last_block

    async def get_n_last_active_blocks_by_pair_id(self, n: int, pair_id: UUID) -> Optional[list[Block]]:
        last_blocks = await self.block_repository.get_n_last_active_blocks_by_pair_id(n, pair_id)
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
        if last_block:
            logger.info(f'last completed block is {last_block.id} ({last_block.status})')
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
        if result_vector[0] == .0:
            result_vector = (await self.block_repository.get_previous_block(block)).result_vector

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

    async def process_completed_block(self, block: Block, rewards: Rewards, new_block_id: UUID) -> None:
        rewards_by_user_id = {
            reward.user_id: reward.reward for reward in rewards.user_rewards
        }
        for bet in block.bets:
            if bet.status != BetStatus.PENDING:
                continue

            # todo: refactor to Bet/User service?
            update_dto = UpdateBetDTO(
                status=BetStatus.RESOLVED
            )
            await self.bet_repository.update(obj_id=bet.id, obj=update_dto)
            # NEWBET
            await self.user_repository.fund_user(user_id=bet.user_id, amount=bet.amount + rewards_by_user_id[bet.user_id])

            new_bet_amount = bet.amount + rewards_by_user_id[bet.user_id]
            if new_bet_amount > 0:
                new_bet = PlaceBetRequest(
                    pair_id=bet.pair.id,
                    amount=new_bet_amount,
                    predicted_vector=bet.vector,
                )
                logger.info(f'Повторная ставка: {new_bet}')
                await self.bet_service.create_bet(create_dto=new_bet, user_id=bet.user_id)
            else:
                logger.error(f"Somehow new_bet_amount <= 0 for {bet.id}")

    async def get_block(self, block_id: UUID) -> Block:
        try:
            block = await self.block_repository.get(block_id)
        except RepositoryNotFoundException:
            raise NotFoundException(f"Block with ID {block_id} not found")
        return block

    async def get_current_block_state(self) -> BlockStateResponse:
        try:
            block = await self.block_repository.get_current_block_state()
        except RepositoryNotFoundException:
            raise NotFoundException(f"Current block not found")
        return block

