from abc import ABC, abstractmethod

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
