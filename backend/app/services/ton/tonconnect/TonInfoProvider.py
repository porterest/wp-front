from dataclasses import dataclass

from pytonconnect import TonConnect


@dataclass
class TonInfoProvider:
    def get_wallets(self) -> dict:
        return TonConnect.get_wallets()

    def get_manifest(self) -> str:
        return 'https://raw.githubusercontent.com/daria021/dummy/refs/heads/main/tonconnect-manifest.json'
