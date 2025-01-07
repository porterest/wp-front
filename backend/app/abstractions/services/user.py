from abc import ABC, abstractmethod
from uuid import UUID

from domain.dto.user import UpdateUserDTO
from domain.metaholder.responses.user import UserBetsResponse, UserHistoryResponse
from domain.models import User
from domain.models.reward_model import Rewards
from domain.models.user import BettingActivity


class UserServiceInterface(ABC):
    @abstractmethod
    async def get_user(self, user_id: UUID) -> User:
        ...

    @abstractmethod
    async def update_user(self, user_id: UUID, update_dto: UpdateUserDTO) -> User:
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
    async def ensure_user(self, wallet_address: str) -> None:
        ...

    @abstractmethod
    async def deposit_funded(self, deposit_id: UUID) -> None:
        ...

    @abstractmethod
    async def get_users_activity(self, block_id: UUID) -> BettingActivity:
        ...

    @abstractmethod
    async def distribute_rewards(self, rewards: Rewards) -> None:
        ...
