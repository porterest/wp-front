import asyncio
from dataclasses import dataclass

from httpx import AsyncClient
from pydantic import SecretStr

from ahvac.abstractions import VaultClientInterface

DEV_MODE: bool = True


def set_dev_mode(dev_mode: bool) -> None:
    global DEV_MODE
    DEV_MODE = dev_mode


@dataclass
class VaultClient(VaultClientInterface):
    vault_host: str
    vault_port: int

    token: SecretStr

    base_url: str = ''

    def __post_init__(self):
        if DEV_MODE:
            self.base_url = f'http://{self.vault_host}:{self.vault_port}/v1/'
        else:
            self.base_url = f'https://{self.vault_host}:{self.vault_port}/v1/'  # https if vault in production

        self.client = AsyncClient(
            base_url=self.base_url,
            headers={
                "X-Vault-Token": self.token.get_secret_value(),
            }
        )

    async def get_secret(self, path: str, key: str) -> SecretStr:
        response = await self.client.get(
            url=f'/secret/data/{path}',
        )

        response.raise_for_status()

        return SecretStr(response.json()['data']['data'][key])


if __name__ == '__main__':
    client = VaultClient(
        vault_host='0.0.0.0',
        vault_port=8200,
        token=SecretStr('root')
    )

    print(asyncio.run(client.get_secret('awpk', 'lol')))
