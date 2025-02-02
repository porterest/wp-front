from abc import ABC, abstractmethod
from uuid import UUID


class InnerTokenInterface(ABC):
    @abstractmethod
    async def mint(self, amount: float):
        ...

    @abstractmethod
    async def withdraw_to_user(self, user_id: UUID, amount: float):
        ...
