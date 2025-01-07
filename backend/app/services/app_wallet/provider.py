from dataclasses import dataclass
from uuid import UUID

from abstractions.repositories.app_wallet import AppWalletRepositoryInterface
from abstractions.services.app_wallet import AppWalletProviderInterface
from abstractions.services.app_wallet.vault import VaultServiceInterface
from domain.models import AppWallet


@dataclass
class AppWalletProvider(AppWalletProviderInterface):
    vault_service: VaultServiceInterface
    wallet_repository: AppWalletRepositoryInterface

    deposit_wallet_id: UUID = UUID('46b83ad7-d3e2-4f52-b30e-ce2231464cd0')
    withdraw_wallet_id: UUID = UUID('46b83ad7-d3e2-4f52-b30e-ce2231464cd0')

    async def get_deposit_wallet(self) -> str:
        wallet = await self.wallet_repository.get(self.deposit_wallet_id)
        return wallet.address

    async def get_withdraw_wallet(self) -> AppWallet:
        wallet = await self.wallet_repository.get(self.withdraw_wallet_id)
        private_key = await self.vault_service.get_wallet_private_key(wallet_id=wallet.id)
        wallet.private_key = private_key
        return wallet

    async def get_wallet_mnemonic(self) -> list[str]:
        # with open("./secret.txt", "rt") as secret:
        #     mnemonic = secret.read()
        #
        # return mnemonic.split()
        ...
