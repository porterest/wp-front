from abc import ABC, abstractmethod

from pydantic import SecretStr


class VaultClientInterface(ABC):
    @abstractmethod
    async def get_secret(self, path: str, key: str) -> SecretStr:
        ...
