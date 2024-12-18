from dataclasses import dataclass
from enum import Enum

from httpx import AsyncClient

from abstractions.services.tonclient import TonClientInterface


class HTTPMethod(Enum):
    GET = 'get'
    POST = 'post'


@dataclass
class TonApiClient(TonClientInterface):
    base_url: str = ''

    get_address_endpoint: str = ''
    get_pubkey_endpoint: str = ''

    def _get_client(self) -> AsyncClient:
        return AsyncClient(base_url=self.base_url)

    async def get_public_key(self, address: str) -> str:
        ...
