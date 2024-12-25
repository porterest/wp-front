from dataclasses import dataclass
from uuid import UUID

from pydantic import SecretStr

from abstractions.services.app_wallet.vault import VaultServiceInterface
from ahvac import VaultClientInterface


@dataclass
class VaultService(VaultServiceInterface):
    client: VaultClientInterface

    awpk_path: str = 'awpk'

    async def get_wallet_private_key(self, wallet_id: UUID) -> SecretStr:
        value = await self.client.get_secret(
            path=self.awpk_path,
            key=str(wallet_id),
        )

        return value
