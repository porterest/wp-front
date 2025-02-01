import os
from dataclasses import dataclass, field

from pydantic import SecretStr

from .abstractions import VaultClientInterface


@dataclass
class FileSystemVaultClient(VaultClientInterface):
    expected_path: str
    expected_key: str

    private_key: str = field(default_factory=lambda: SecretStr(os.getenv('APP_WALLET_PRIVATE_KEY')))

    async def get_secret(self, path: str, key: str) -> SecretStr:
        """
        Retrieves the secret if the correct path and key are provided.

        :param path: Requested path (must match expected path).
        :param key: Requested key (must match expected key).
        :return: Decrypted secret as a SecretStr.
        :raises ValueError: If path/key is incorrect.
        """
        if path != self.expected_path or key != self.expected_key:
            raise ValueError("Unauthorized access: Incorrect path or key.")

        return SecretStr(self.private_key)
