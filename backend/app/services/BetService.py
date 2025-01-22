from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.exc import NoResultFound

from abstractions.repositories.bet import BetRepositoryInterface
from abstractions.repositories.block import BlockRepositoryInterface
from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.bet import BetServiceInterface
from domain.dto.bet import CreateBetDTO, UpdateBetDTO
from domain.dto.user import UpdateUserDTO
from domain.enums import BetStatus
from domain.models.bet import Bet
from services.exceptions import NotFoundException


@dataclass
class BetService(BetServiceInterface):
    bet_repository: BetRepositoryInterface
    user_repository: UserRepositoryInterface
    block_repository: BlockRepositoryInterface

    async def create_bet(self, create_dto: CreateBetDTO) -> None:
        return await self.bet_repository.create(create_dto)

    async def get(self, bet_id: UUID) -> Bet:
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

    async def cancel_bet(self, bet_id: UUID) -> None:
        bet = await self.get(bet_id)
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

    async def resolve_bets_for_block(self, block_id: UUID, results: dict) -> None:
        """
        Обрабатывает все ставки для указанного блока на основе результатов.
        """
        block = await self.block_repository.get(block_id)
        bets = block.bets
        for bet in bets:
            # Пример обработки на основе результатов
            bet.result = results.get(bet.id, 0)
            dto = UpdateBetDTO(
                status=BetStatus.RESOLVED,
            )
            await self.bet_repository.update(bet.id, dto)
