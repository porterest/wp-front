from abc import ABC, abstractmethod

from domain.models import AppWallet


class AppWalletProviderInterface(ABC):
    @abstractmethod
    async def get_deposit_address(self) -> str:
        ...

    @abstractmethod
    async def get_withdraw_wallet(self) -> AppWallet:
        ...

    @abstractmethod
    async def get_available_inner_token_amount(self) -> float:
        ...

