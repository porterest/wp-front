from abc import ABC, abstractmethod
from uuid import UUID

from domain.metaholder.responses import UserHistoryResponse
from domain.models import User


class UserServiceInterface(ABC):
    @abstractmethod
    async def get_user(self, user_id: UUID) -> User:
        ...

    @abstractmethod
    async def get_user_by_tg_id(self, tg_id: int) -> User:
        ...

    @abstractmethod
    async def get_user_by_wallet(self, wallet_address: str) -> User:
        ...

    @abstractmethod
    async def get_user_history(self, user_id: UUID) -> UserHistoryResponse:
        ...
