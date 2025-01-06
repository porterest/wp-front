from abc import ABC, abstractmethod


class InnerTokenInterface(ABC):
    @abstractmethod
    async def mint(self):
        ...

    @abstractmethod
    async def perform_swap(self, address: str, amount: int, from_token: str, to_token: str):
        ...
