from abstractions.services.dex import DexServiceInterface
from dependencies.services.app_wallet.service import get_app_wallet_service
from services.DEXService import MockDexService


def get_dex_service() -> DexServiceInterface:
    return MockDexService(
        app_wallet_service=get_app_wallet_service(),
    )  # todo: mock
