from abc import ABC, abstractmethod
from uuid import UUID

from domain.models import AppWallet
from domain.models.swap import CalculatedSwap


class AppWalletProviderInterface(ABC):
    @abstractmethod
    async def get_deposit_wallet(self) -> AppWallet:
        ...

    @abstractmethod
    async def get_withdraw_wallet(self) -> AppWallet:
        ...

    @abstractmethod
    async def get_available_inner_token_amount(self) -> float:
        ...

    @abstractmethod
    async def get_token_amount(self, token_symbol: str) -> float:
        ...

    @abstractmethod
    async def get_wallet_id_to_perform_swap(self, swap: CalculatedSwap) -> UUID:
        ...

    @abstractmethod
    async def get_wallet(self, wallet_id: UUID) -> AppWallet:
        ...
