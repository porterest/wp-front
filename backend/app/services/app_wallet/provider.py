from dataclasses import dataclass
from uuid import UUID

from abstractions.repositories.app_wallet import AppWalletRepositoryInterface
from abstractions.services.app_wallet import AppWalletProviderInterface
from abstractions.services.app_wallet.vault import VaultServiceInterface
from domain.models import AppWallet
from domain.models.app_wallet import AppWalletWithPrivateData


@dataclass
class AppWalletProvider(AppWalletProviderInterface):
    vault_service: VaultServiceInterface
    wallet_repository: AppWalletRepositoryInterface

    deposit_wallet_id: UUID = UUID('46b83ad7-d3e2-4f52-b30e-ce2231464cd0')
    withdraw_wallet_id: UUID = UUID('46b83ad7-d3e2-4f52-b30e-ce2231464cd0')


    async def get_wallet(self, wallet_id: UUID) -> AppWallet:
        return await self.wallet_repository.get(wallet_id)

    async def get_token_amount(self, token_symbol: str) -> float:
        return 20  # todo: mock !и это тоже ;D

    async def get_available_inner_token_amount(self) -> float:
        return 10  # todo: mock !не используется ;D

    async def get_deposit_wallet(self) -> AppWallet:
        wallet = await self.wallet_repository.get(self.deposit_wallet_id)
        return wallet

    async def get_withdraw_wallet(self) -> AppWalletWithPrivateData:
        wallet = await self.wallet_repository.get(self.withdraw_wallet_id)
        private_key = await self.vault_service.get_wallet_private_key(wallet_id=wallet.id)
        return AppWalletWithPrivateData.from_app_wallet(app_wallet=wallet, private_key=private_key)
