from abc import ABC, abstractmethod


class PublicKeyProviderInterface(ABC):
    @abstractmethod
    async def get_public_key(self, address: str) -> str:
        ...
