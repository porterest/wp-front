from ahvac import VaultClientInterface
from ahvac.fs import FileSystemVaultClient
from settings import settings


def get_vault_client() -> VaultClientInterface:
    return FileSystemVaultClient(
        expected_path=settings.secrets.expected_path,
        expected_key=settings.secrets.expected_key,
    )
