from abc import ABC, abstractmethod
from typing import Annotated, TypeVar
from uuid import UUID

from domain.models import AppWallet
from domain.models.swap import CalculatedSwap


AppWalletWithPrivateData = TypeVar(
    'AppWalletWithPrivateData',
    lambda x: x.private_key is not None,
    lambda x: isinstance(x, AppWallet),
)

class AppWalletServiceInterface(ABC):
    @abstractmethod
    async def get_deposit_address(self) -> Annotated[str, 'Address']:
        ...

    @abstractmethod
    async def get_deposit_wallet_id(self) -> UUID:
        ...

    @abstractmethod
    async def withdraw_to_user(self, user_id: UUID, amount: float):
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
