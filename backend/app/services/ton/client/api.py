import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass
from enum import Enum

from httpx import AsyncClient
from pydantic import SecretStr

from abstractions.services.tonclient import TonClientInterface
from services.ton.public_keys.api import TonApiPublicKeyResponse
from services.ton.public_keys.exceptions import PublicKeyCannotBeFetchedException


class HTTPMethod(Enum):
    GET = 'get'
    POST = 'post'


logger = logging.getLogger(__name__)


@dataclass
class TonApiClient(TonClientInterface):
    token: SecretStr
    base_url: str = 'https://tonapi.io'

    get_address_endpoint: str = ''
    get_pubkey_endpoint: str = '/v2/accounts/{}/publickey'

    @asynccontextmanager
    async def _get_client(self) -> AsyncClient:
        async with AsyncClient(base_url=self.base_url) as client:
            yield client

    def _get_public_key_endpoint(self, address: str):
        return self.get_pubkey_endpoint.replace('{}', address)

    async def get_public_key(self, address: str) -> str:
        async with self._get_client() as client:  # type: AsyncClient
            response = await client.get(
                url=self._get_public_key_endpoint(address),
            )
        if not response.is_success:
            logger.error(f"Failed to fetch {address} public key via API")
            raise PublicKeyCannotBeFetchedException()

        response = TonApiPublicKeyResponse.model_validate(response.json())
        return response.public_key

import logging
from dataclasses import dataclass
from enum import Enum

from pydantic import SecretStr

from abstractions.services.tonclient import TonClientInterface


# class HTTPMethod(Enum):
#     GET = 'get'
#     POST = 'post'
#
#
# logger = logging.getLogger(__name__)
#
#
# @dataclass
# class MockTonApiClient(TonClientInterface):
#     token: SecretStr
#     base_url: str = 'https://tonapi.io'
#
#     async def get_public_key(self, address: str) -> str:
#         logger.info(f"Mocking public key retrieval for address: {address}")
#         return "mocked_public_key"
#
#
# # Usage example
# async def main():
#     mock_client = MockTonApiClient(token="dummy_token")
#     public_key = await mock_client.get_public_key("dummy_address")
#     logger.info(f"Retrieved mocked public key: {public_key}")
