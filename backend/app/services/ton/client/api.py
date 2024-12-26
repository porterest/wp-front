import logging
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

    def _get_client(self) -> AsyncClient:
        return AsyncClient(base_url=self.base_url)

    def _get_public_key_endpoint(self, address: str):
        return self.get_pubkey_endpoint.replace('{}', address)

    async def get_public_key(self, address: str) -> str:
        with self._get_client() as client:  # type: AsyncClient
            response = await client.get(
                url=self._get_public_key_endpoint(address),
            )
        if not response.is_success:
            logger.error(f"Failed to fetch {address} public key via API")
            raise PublicKeyCannotBeFetchedException()

        response = TonApiPublicKeyResponse.model_validate_json(response.json())
        return response.public_key
