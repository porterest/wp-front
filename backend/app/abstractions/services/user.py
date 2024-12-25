from abc import ABC, abstractmethod
from uuid import UUID

from domain.dto.user import UpdateUserDTO
from domain.metaholder.responses.user import UserBetsResponse, UserHistoryResponse
from domain.models import User


class UserServiceInterface(ABC):
    @abstractmethod
    async def get_user(self, user_id: UUID) -> User:
        ...
    @abstractmethod
    async def update_user(self, user_id: UUID, user: UpdateUserDTO) -> User:
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
