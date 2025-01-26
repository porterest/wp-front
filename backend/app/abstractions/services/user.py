from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from domain.metaholder.responses import BetResponse
from domain.metaholder.responses.user import UserBetsResponse, UserHistoryResponse
from domain.models import User


class UserServiceInterface(ABC):
    @abstractmethod
    async def get_user(self, user_id: UUID) -> User:
        ...

    @abstractmethod
    async def get_user_by_wallet(self, wallet_address: str) -> User:
        ...

    @abstractmethod
    async def get_user_history(self, user_id: UUID) -> UserHistoryResponse:
        ...

    @abstractmethod
    async def get_user_bets(self, user_id: UUID) -> UserBetsResponse:
        ...

    @abstractmethod
    async def get_last_user_bet(self, user_id: UUID, pair_id: UUID) -> Optional[BetResponse]:
        ...

    @abstractmethod
    async def ensure_user(self, wallet_address: str) -> None:
        ...

    @abstractmethod
    async def deposit_funded(self, deposit_id: UUID) -> None:
        ...
