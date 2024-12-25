from abc import ABC, abstractmethod
from uuid import UUID
from typing import List, Dict
from domain.models.bet import Bet
from domain.dto.bet import CreateBetDTO, UpdateBetDTO


class BetServiceInterface(ABC):
    @abstractmethod
    async def create_bet(self, create_dto: CreateBetDTO) -> None:
        """
        Создаёт новую ставку.
        """
        ...

    @abstractmethod
    async def get_bet_by_id(self, bet_id: UUID) -> Bet:
        """
        Получает ставку по её ID.
        """
        ...

    @abstractmethod
    async def get_bets_by_user_id(self, user_id: UUID) -> List[Bet]:
        """
        Возвращает список ставок пользователя по его ID.
        """
        ...

    @abstractmethod
    async def get_bets_by_block_id(self, block_id: UUID) -> List[Bet]:
        """
        Возвращает список ставок для указанного блока.
        """
        ...

    @abstractmethod
    async def update_bet(self, bet_id: UUID, update_dto: UpdateBetDTO) -> Bet:
        """
        Обновляет существующую ставку на основе её ID.
        """
        ...

    @abstractmethod
    async def cancel_bet(self, bet: Bet) -> None:
        """
        Отменяет ставку, добавляя сумму ставки к балансу пользователя.
        """
        ...

    @abstractmethod
    async def resolve_bets_for_block(self, block_id: UUID, results: Dict[UUID, float]) -> None:
        """
        Обрабатывает ставки для указанного блока на основе результатов.
        """
        ...
