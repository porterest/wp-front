import logging
from dataclasses import dataclass
from uuid import UUID

from abstractions.services.app_wallet import AppWalletServiceInterface, AppWalletProviderInterface
from abstractions.services.user import UserServiceInterface
from domain.models import AppWallet
from domain.models.app_wallet import AppWalletWithPrivateData

logger = logging.getLogger(__name__)


@dataclass
class AppWalletService(AppWalletServiceInterface):
    provider: AppWalletProviderInterface
    user_service: UserServiceInterface = None

    async def get_wallet(self, wallet_id: UUID) -> AppWallet:
        return await self.provider.get_wallet(wallet_id)

    async def get_withdraw_wallet(self) -> AppWalletWithPrivateData:
        return await self.provider.get_withdraw_wallet()

    async def get_deposit_wallet(self) -> AppWallet:
        wallet = await self.provider.get_deposit_wallet()
        return wallet
