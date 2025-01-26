from abstractions.services.public_keys import PublicKeyProviderInterface
from services.ton.public_keys.public_keys_tonapi_provider import PublicKeyTonApiProvider
from settings import settings


def get_public_key_provider() -> PublicKeyProviderInterface:
    return PublicKeyTonApiProvider(
        api_token=settings.ton.tonapi_key,
    )
