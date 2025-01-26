from abstractions.services.public_keys import PublicKeyProviderInterface
from dependencies.services.ton.client import get_ton_client
from services.ton.public_keys.public_keys_tonapi_provider import PublicKeyTonApiProvider
from settings import settings


def get_public_key_provider() -> PublicKeyProviderInterface:
    return PublicKeyTonApiProvider(
        ton_client=get_ton_client(),
    )
