from abstractions.services.dex import DexServiceInterface
from services.DEXService import DexService


def get_dex_service() -> DexServiceInterface:
    return DexService()
