from abstractions.services.app_wallet.vault import VaultServiceInterface
from dependencies.services.app_wallet.vault.client import get_vault_client
from services.app_wallet.vault import VaultService


def get_vault_service() -> VaultServiceInterface:
    return VaultService(
        client=get_vault_client(),
    )
