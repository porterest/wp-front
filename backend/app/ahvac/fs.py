import logging
import os
from dataclasses import dataclass, field

from pydantic import SecretStr
from pytoniq_core.crypto.keys import mnemonic_to_private_key, mnemonic_is_valid
from .abstractions import VaultClientInterface

logger = logging.getLogger(__name__)

@dataclass
class FileSystemVaultClient(VaultClientInterface):
    expected_path: str
    expected_key: str

    mnemonic: SecretStr = field(default_factory=lambda: SecretStr(os.getenv('APP_WALLET_MNEMONIC')))

    async def get_secret(self, path: str, key: str) -> bytes:
        """
        Retrieves the secret if the correct path and key are provided.

        :param path: Requested path (must match expected path).
        :param key: Requested key (must match expected key).
        :return: Decrypted secret as a SecretStr.
        :raises ValueError: If path/key is incorrect.
        """
        if path != self.expected_path or key != self.expected_key:
            raise ValueError("Unauthorized access: Incorrect path or key.")

        if not mnemonic_is_valid(self.mnemonic.get_secret_value().split()):
            raise Exception('Mnemonic is invalid')

        return mnemonic_to_private_key(self.mnemonic.get_secret_value().split())[1]
