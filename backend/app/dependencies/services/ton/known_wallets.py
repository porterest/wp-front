from abstractions.services.wallets_provider import KnownWalletsProviderInterface
from services.ton.known_wallets import KnownWalletsProvider


def get_known_wallets_provider() -> KnownWalletsProviderInterface:
    return KnownWalletsProvider(

    )
