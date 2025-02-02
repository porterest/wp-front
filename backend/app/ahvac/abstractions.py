from abc import ABC, abstractmethod


class VaultClientInterface(ABC):
    @abstractmethod
    async def get_secret(self, path: str, key: str) -> bytes:
        ...
