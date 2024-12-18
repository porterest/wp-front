import logging

from httpx import AsyncClient

from abstractions.services.public_keys import PublicKeyProviderInterface
from .api import TonApiPublicKeyResponse
from .exceptions import PublicKeyCannotBeFetchedException

logger = logging.getLogger(__name__)


class PublicKeyTonApiProvider(PublicKeyProviderInterface):
    api_base_url: str = ''

    get_public_key_endpoint: str = '/v2/accounts/{}/publickey'

    def _get_client(self) -> AsyncClient:
        return AsyncClient(base_url=self.api_base_url)

    def _get_public_key_endpoint(self, address: str):
        return self.get_public_key_endpoint.replace('{}', address)

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
