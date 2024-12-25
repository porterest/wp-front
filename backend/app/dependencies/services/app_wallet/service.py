from abstractions.services.app_wallet import AppWalletServiceInterface
from dependencies.services.app_wallet.provider import get_app_wallet_provider
from services.app_wallet.service import AppWalletService


def get_app_wallet_service() -> AppWalletServiceInterface:
    return AppWalletService(
        provider=get_app_wallet_provider()
    )
