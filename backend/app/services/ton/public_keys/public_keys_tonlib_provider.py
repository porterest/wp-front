from abstractions.services.public_keys import PublicKeyProviderInterface
from abstractions.services.tonclient import TonClientInterface


class PublicKeyTonLibProvider(PublicKeyProviderInterface):
    ton_client: TonClientInterface

    async def get_public_key(self, address: str) -> str:
        return await self.ton_client.get_public_key(address)
