from dataclasses import dataclass
from uuid import UUID

from abstractions.repositories.app_wallet import AppWalletRepositoryInterface
from abstractions.services.app_wallet import AppWalletProviderInterface
from abstractions.services.app_wallet.vault import VaultServiceInterface
from domain.models import AppWallet
from domain.models.swap import CalculatedSwap


@dataclass
class AppWalletProvider(AppWalletProviderInterface):
    async def get_wallet_id_to_perform_swap(self, swap: CalculatedSwap) -> UUID:
        return self.deposit_wallet_id

    async def get_wallet(self, wallet_id: UUID) -> AppWallet:
        return await self.wallet_repository.get(wallet_id)

    async def get_token_amount(self, token_symbol: str) -> float:
        return 20  # todo: mock

    vault_service: VaultServiceInterface
    wallet_repository: AppWalletRepositoryInterface

    deposit_wallet_id: UUID = UUID('46b83ad7-d3e2-4f52-b30e-ce2231464cd0')
    withdraw_wallet_id: UUID = UUID('46b83ad7-d3e2-4f52-b30e-ce2231464cd0')

    async def get_available_inner_token_amount(self) -> float:
        return 10  # todo: mock

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
