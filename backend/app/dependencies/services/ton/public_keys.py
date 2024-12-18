from abstractions.services.public_keys import PublicKeyProviderInterface
from services.ton.public_keys.public_keys_tonlib_provider import PublicKeyTonLibProvider


def get_public_key_provider() -> PublicKeyProviderInterface:
    return PublicKeyTonLibProvider(

    )
