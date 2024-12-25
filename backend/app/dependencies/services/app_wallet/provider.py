from abstractions.services.app_wallet import AppWalletProviderInterface
from dependencies.repositories.app_wallet import get_app_wallet_repository
from dependencies.services.app_wallet.vault.service import get_vault_service
from services.app_wallet.provider import AppWalletProvider


def get_app_wallet_provider() -> AppWalletProviderInterface:
    return AppWalletProvider(
        wallet_repository=get_app_wallet_repository(),
        vault_service=get_vault_service(),
    )
