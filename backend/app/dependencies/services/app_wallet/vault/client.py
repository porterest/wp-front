from ahvac import VaultClient, VaultClientInterface
from settings import settings


def get_vault_client() -> VaultClientInterface:
    return VaultClient(
        vault_host=settings.vault.host,
        vault_port=settings.vault.port,
        token=settings.vault.token,
    )
