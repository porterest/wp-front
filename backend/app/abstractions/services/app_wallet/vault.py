from abc import ABC, abstractmethod
from uuid import UUID


class VaultServiceInterface(ABC):
    @abstractmethod
    async def get_wallet_private_key(self, wallet_id: UUID) -> bytes:
        ...
