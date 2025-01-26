from abc import ABC, abstractmethod
from uuid import UUID

from domain.models import AppWallet
from domain.models.app_wallet import AppWalletWithPrivateData


class AppWalletServiceInterface(ABC):
    @abstractmethod
    async def get_withdraw_wallet(self) -> AppWalletWithPrivateData:
        ...

    @abstractmethod
    async def get_deposit_wallet(self) -> AppWallet:
        ...

    @abstractmethod
    async def get_wallet(self, wallet_id: UUID) -> AppWallet:
        ...
