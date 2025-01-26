import logging
from dataclasses import dataclass

from pydantic import SecretStr

from abstractions.services.public_keys import PublicKeyProviderInterface
from abstractions.services.tonclient import TonClientInterface

logger = logging.getLogger(__name__)


@dataclass
class PublicKeyTonApiProvider(PublicKeyProviderInterface):
    ton_client: TonClientInterface

    async def get_public_key(self, address: str) -> str:
        return await self.ton_client.get_public_key(address)
