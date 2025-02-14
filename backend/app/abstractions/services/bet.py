from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from domain.dto.bet import CreateBetDTO
from domain.metaholder.requests.bet import PlaceBetRequest
from domain.metaholder.responses import BetResponse
from infrastructure.db.entities import Bet


class BetServiceInterface(ABC):
    @abstractmethod
    async def create_bet(self, create_dto: PlaceBetRequest, user_id: UUID) -> None:  # NEWBET
        """
        Создаёт новую ставку.
        """
        ...

    @abstractmethod
    async def cancel_bet(self, bet_id: UUID) -> None:
        """
        Отменяет ставку, добавляя сумму ставки к балансу пользователя.
        """
        ...

    @abstractmethod
    async def get_last_user_bet(self, user_id: UUID, pair_id: UUID) -> Optional[Bet]:
        ...
    @abstractmethod
    async def get_last_user_completed_bet(self, user_id: UUID) -> Optional[Bet]:
        ...
