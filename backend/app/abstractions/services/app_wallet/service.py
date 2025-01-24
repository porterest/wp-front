from abc import ABC, abstractmethod
from typing import Annotated
from uuid import UUID

from domain.models import AppWallet
from domain.models.app_wallet import AppWalletWithPrivateData
from domain.models.swap import CalculatedSwap


class AppWalletServiceInterface(ABC):
    @abstractmethod
    async def get_withdraw_wallet(self) -> AppWalletWithPrivateData:
        ...

    @abstractmethod
    async def get_deposit_address(self) -> Annotated[str, 'Address']:
        ...

    @abstractmethod
    async def get_deposit_wallet_id(self) -> UUID:
        ...

    @abstractmethod
    async def get_deposit_wallet(self) -> AppWallet:
        ...

    @abstractmethod
    async def get_inner_tokens_amount(self) -> float:
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
