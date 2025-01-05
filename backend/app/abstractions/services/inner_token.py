from abc import ABC, abstractmethod


class InnerTokenInterface(ABC):
    @abstractmethod
    async def mint(self):
        ...
