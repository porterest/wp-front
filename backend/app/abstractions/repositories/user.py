from abc import ABC, abstractmethod
from uuid import UUID

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.user import CreateUserDTO, UpdateUserDTO
from domain.models import User


class UserRepositoryInterface(
    CRUDRepositoryInterface[
        User, CreateUserDTO, UpdateUserDTO
    ],
    ABC,
):
    @abstractmethod
    async def get_by_wallet(self, wallet_address: str) -> User:
        ...

    @abstractmethod
    async def fund_user(self, user_id: UUID, amount: float) -> None:
        ...
