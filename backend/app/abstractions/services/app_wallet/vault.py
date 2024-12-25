from abc import ABC, abstractmethod
from uuid import UUID

from pydantic import SecretStr


class VaultServiceInterface(ABC):
    @abstractmethod
    async def get_wallet_private_key(self, wallet_id: UUID) -> SecretStr:  # it's all for security reasons
        ...
