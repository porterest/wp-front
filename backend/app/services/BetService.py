from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.exc import NoResultFound

from abstractions.repositories.bet import BetRepositoryInterface
from abstractions.services.bet import BetServiceInterface
from abstractions.services.user import UserServiceInterface
from domain.dto.bet import CreateBetDTO, UpdateBetDTO
from domain.dto.user import UpdateUserDTO
from domain.models.bet import Bet
from services.exceptions import NotFoundException


@dataclass
class BetService(BetServiceInterface):
    bet_repository: BetRepositoryInterface
    user_service: UserServiceInterface

    async def create_bet(self, create_dto: CreateBetDTO) -> None:
        return await self.bet_repository.create(create_dto)

    async def get_bet_by_id(self, bet_id: UUID) -> Bet:
        try:
            return await self.bet_repository.get(obj_id=bet_id)
        except NoResultFound:
            raise NotFoundException(f"Bet with ID {bet_id} not found.")

    # async def get_bets_by_user_id(self, user_id: UUID) -> List[Bet]:
    #     return await self.bet_repository.get_by_user_id(user_id=user_id)
    #
    # async def get_bets_by_block_id(self, block_id: UUID) -> List[Bet]:
    #     return await self.bet_repository.get_by_block_id(block_id=block_id)

    async def update_bet(self, bet_id: UUID, update_dto: UpdateBetDTO) -> None:
        return await self.bet_repository.update(bet_id, update_dto)

    async def cancel_bet(self, bet: Bet) -> None:
        user = await self.user_service.get_user(bet.user.id)

        update_user = UpdateUserDTO(
            balance=user.balance + bet.amount,
        )

        await self.user_service.update_user(user_id=user.id, user=update_user)

        update_bet = UpdateBetDTO(
            status="cancelled"
        )
        await self.bet_repository.update(bet.id, update_bet)

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
