import logging
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from pytoniq import LiteBalancer, WalletV4R2

from abstractions.services.app_wallet import AppWalletServiceInterface, AppWalletProviderInterface
from abstractions.services.user import UserServiceInterface
from domain.models import AppWallet
from domain.models.app_wallet import AppWalletWithPrivateData
from domain.models.swap import CalculatedSwap

logger = logging.getLogger(__name__)


@dataclass
class AppWalletService(AppWalletServiceInterface):
    provider: AppWalletProviderInterface
    user_service: UserServiceInterface = None

    async def get_wallet_id_to_perform_swap(self, swap: CalculatedSwap) -> UUID:
        return await self.provider.get_wallet_id_to_perform_swap(swap)

    async def get_wallet(self, wallet_id: UUID) -> AppWallet:
        return await self.provider.get_wallet(wallet_id)

    async def get_withdraw_wallet(self) -> AppWalletWithPrivateData:
        return await self.provider.get_withdraw_wallet()

    async def get_token_amount(self, token_symbol: str) -> float:
        return await self.provider.get_token_amount(token_symbol)

    async def get_inner_tokens_amount(self) -> float:
        return await self.provider.get_available_inner_token_amount()

    async def get_deposit_address(self) -> Annotated[str, 'Address']:
        wallet = await self.provider.get_deposit_wallet()
        return wallet.address

    async def get_deposit_wallet(self) -> AppWallet:
        wallet = await self.provider.get_deposit_wallet()
        return wallet

    async def get_deposit_wallet_id(self) -> UUID:
        wallet = await self.provider.get_deposit_wallet()
        return wallet.id
