import logging
from dataclasses import dataclass

from pydantic import SecretStr

from abstractions.services.public_keys import PublicKeyProviderInterface
from ..client.api import MockTonApiClient

logger = logging.getLogger(__name__)


@dataclass
class PublicKeyTonApiProvider(PublicKeyProviderInterface):
    api_token: SecretStr

    def __post_init__(self):
        self.client = MockTonApiClient(token=self.api_token) #mock

    async def get_public_key(self, address: str) -> str:
        return await self.client.get_public_key(address)
