from abc import ABC, abstractmethod


class DexServiceInterface(ABC):
    @abstractmethod
    async def make_block_tx(self, ):
        ...
