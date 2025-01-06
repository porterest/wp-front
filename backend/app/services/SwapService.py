from dataclasses import dataclass
from uuid import UUID

from abstractions.repositories.deposit import DepositRepositoryInterface
from abstractions.services.app_wallet import AppWalletProviderInterface
from abstractions.services.dex import DexServiceInterface
from abstractions.services.swap import SwapServiceInterface
from domain.enums.deposit import DepositEntryStatus


@dataclass
class SwapService(SwapServiceInterface):
    deposit_repository: DepositRepositoryInterface
    app_wallet_provider: AppWalletProviderInterface
    dex_service: DexServiceInterface

    async def swap_deposit(self, deposit_id: UUID) -> None:
        deposit = await self.deposit_repository.get(deposit_id)
        wallet = await self.app_wallet_provider.get_deposit_wallet()

        if deposit.status == DepositEntryStatus.FUNDED:
            await self.dex_service.perform_swap()
