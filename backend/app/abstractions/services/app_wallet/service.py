from abc import ABC, abstractmethod
from typing import Annotated
from uuid import UUID


class AppWalletServiceInterface(ABC):
    @abstractmethod
    async def get_deposit_address(self) -> Annotated[str, 'Address']:
        ...

    @abstractmethod
    async def withdraw_to_user(self, user_id: UUID, amount: float):
        ...
