from abc import ABC, abstractmethod
from typing import Annotated
from uuid import UUID


class InnerTokenInterface(ABC):
    @abstractmethod
    async def mint(self, amount: Annotated[float, 'nano']):
        ...

    @abstractmethod
    async def withdraw_to_user(self, user_id: UUID, amount: int):
        ...
