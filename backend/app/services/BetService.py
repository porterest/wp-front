from dataclasses import dataclass
from typing import List
from uuid import UUID

from sqlalchemy.exc import NoResultFound

from abstractions.repositories.bet import BetRepositoryInterface
from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.bet import BetServiceInterface
from domain.dto.bet import CreateBetDTO, UpdateBetDTO
from domain.dto.user import UpdateUserDTO
from domain.models.bet import Bet
from services.exceptions import NotFoundException


@dataclass
class BetService(BetServiceInterface):
    bet_repository: BetRepositoryInterface
    user_service: UserRepositoryInterface
    async def create_bet(self, create_dto: CreateBetDTO) -> Bet:
        return await self.bet_repository.create(create_dto)

    async def get_bet_by_id(self, bet_id: UUID) -> Bet:
        try:
            return await self.bet_repository.get(obj_id=bet_id)
        except NoResultFound:
            raise NotFoundException(f"Bet with ID {bet_id} not found.")

    async def get_bets_by_user_id(self, user_id: UUID) -> List[Bet]:
        return await self.bet_repository.get_by_user_id(user_id=user_id)

    async def get_bets_by_block_id(self, block_id: UUID) -> List[Bet]:
        return await self.bet_repository.get_by_block_id(block_id=block_id)

    async def update_bet(self, bet_id: UUID, update_dto: UpdateBetDTO) -> Bet:
        bet = await self.get_bet_by_id(bet_id=bet_id)
        return await self.bet_repository.update(entity=bet, dto=update_dto)

    async def cancel_bet(self, bet: Bet) -> None:
        user = await self.get_user(bet.user_id)

        update_user = UpdateUserDTO(
            telegram_id=user.tg_id,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            last_activity=user.last_activity,
            wallet_address=user.wallet_address,
            balances=user.balances,
            bets=user.bets,
            transactions=user.transactions,
            deposit=user.deposit,
            balance=user.balance + bet.amount
        )

        await self.update_user(user_id=user.id, update_dto=update_user)

        bet.status = "cancelled"
        await self.bet_repository.update(entity=bet)

    async def resolve_bets_for_block(self, block_id: UUID, results: dict) -> None:
        """
        Обрабатывает все ставки для указанного блока на основе результатов.
        """
        bets = await self.get_bets_by_block_id(block_id=block_id)
        for bet in bets:
            # Пример обработки на основе результатов
            bet.result = results.get(bet.id, 0)
            bet.status = "resolved"
            await self.bet_repository.update(entity=bet)
