import logging
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from abstractions.repositories.bet import BetRepositoryInterface
from abstractions.repositories.block import BlockRepositoryInterface
from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.bet import BetServiceInterface
from domain.dto.bet import CreateBetDTO, UpdateBetDTO
from domain.dto.user import UpdateUserDTO
from domain.enums import BetStatus
from domain.metaholder.requests.bet import PlaceBetRequest
from infrastructure.db.entities import Bet

logger = logging.getLogger(__name__)


@dataclass
class BetService(BetServiceInterface):
    bet_repository: BetRepositoryInterface
    user_repository: UserRepositoryInterface
    block_repository: BlockRepositoryInterface

    # NEWBET
    async def create_bet(self, create_dto: PlaceBetRequest, user_id: UUID) -> None:
        block = await self.block_repository.get_last_completed_block_by_pair_id(pair_id=create_dto.pair_id)
        current_block = await self.block_repository.get_current_block_state(pair_id=create_dto.pair_id)
        user = await self.user_repository.get(user_id)

        current_price = block.result_vector[0]
        deposit = user.balance
        logger.info("deposit")
        logger.info(deposit)
        trend_attack = abs(current_price - create_dto.predicted_vector[0]) / current_price * 100
        logger.info("trend_attack")
        logger.info(trend_attack)
        bet_amount = deposit * trend_attack
        logger.info("bet_amount")
        logger.info(bet_amount)
        dto = CreateBetDTO(
            user_id=user_id,
            pair_id=create_dto.pair_id,
            amount=bet_amount,
            block_id=current_block.block_id,
            vector=create_dto.predicted_vector,
            status=BetStatus.PENDING,
        )

        current_pair_bet = await self.bet_repository.get_last_user_bet(
            user_id=dto.user_id,
            pair_id=dto.pair_id,
        )
        if current_pair_bet and current_pair_bet.status == BetStatus.PENDING:
            await self.cancel_bet(current_pair_bet.id)

        await self.user_repository.fund_user(user_id=dto.user_id, amount=dto.amount * -1)
        return await self.bet_repository.create(dto)

    async def cancel_bet(self, bet_id: UUID) -> None:
        bet = await self.bet_repository.get(bet_id)
        user = await self.user_repository.get(bet.user.id)

        if bet.status == BetStatus.CANCELED:
            return

        if bet.status == BetStatus.RESOLVED:
            return

        update_user = UpdateUserDTO(
            balance=user.balance + bet.amount,
        )

        await self.user_repository.update(obj_id=user.id, obj=update_user)

        update_bet = UpdateBetDTO(
            status=BetStatus.CANCELED
        )
        await self.bet_repository.update(bet.id, update_bet)

    async def get_last_user_bet(self, user_id: UUID, pair_id: UUID) -> Optional[Bet]:
        logger.info('мяу!')

        last_bet = await self.bet_repository.get_last_user_bet(user_id, pair_id)
        logger.info(last_bet)
        return last_bet

    async def get_last_user_completed_bet(self, user_id: UUID) -> Optional[Bet]:
        last_bet = await self.bet_repository.get_last_user_completed_bet(user_id)
        logger.info(last_bet)
        return last_bet
