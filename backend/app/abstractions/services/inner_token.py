from abc import ABC, abstractmethod
from uuid import UUID


class InnerTokenInterface(ABC):
    @abstractmethod
    async def mint(self, amount: int):
        ...
    @abstractmethod
    async def withdraw_to_user(self, user_id: UUID, amount: int):
        ...



