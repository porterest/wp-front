import logging
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from abstractions.repositories.bet import BetRepositoryInterface
from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.bet import BetServiceInterface
from domain.dto.bet import CreateBetDTO, UpdateBetDTO
from domain.dto.user import UpdateUserDTO
from domain.enums import BetStatus
from domain.metaholder.responses import BetResponse


logger = logging.getLogger(__name__)
@dataclass
class BetService(BetServiceInterface):
    bet_repository: BetRepositoryInterface
    user_repository: UserRepositoryInterface

    async def create_bet(self, create_dto: CreateBetDTO) -> None:
        await self.user_repository.fund_user(user_id=create_dto.user_id, amount=create_dto.amount * -1)
        return await self.bet_repository.create(create_dto)

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

    async def get_last_user_bet(self, user_id: UUID, pair_id: UUID) -> Optional[BetResponse]:
        logger.info('мяу!')

        last_bet = await self.bet_repository.get_last_user_bet(user_id, pair_id)
        logger.info(last_bet)
        return last_bet
