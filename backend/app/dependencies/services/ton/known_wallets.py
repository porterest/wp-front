from abstractions.services.known_wallets import KnownWalletsProviderInterface
from services.ton.known_wallets import KnownWalletsProvider


def get_known_wallets_provider() -> KnownWalletsProviderInterface:
    return KnownWalletsProvider(

    )
