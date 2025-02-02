from abc import ABC
from abc import abstractmethod
from typing import Annotated, TypeVar

from pytoniq_core import Address

from domain.models.app_wallet import AppWalletWithPrivateData
from domain.ton import InitialAccountState
from domain.ton.transaction import TonTransaction

Nano = TypeVar(
    'Nano',
    bound=Annotated[int, 'Token amount in nano']
)


class TonClientInterface(ABC):
    @staticmethod
    def get_account_address(
            init_state: InitialAccountState,
            workchain_id: int = 0,
    ) -> Annotated[str, 'Address']:
        ...

    @abstractmethod
    async def mint(
            self,
            amount: Nano,
            token_address: Address,
            admin_wallet: AppWalletWithPrivateData,
    ) -> None:
        ...

    @abstractmethod
    async def send_jettons(
            self,
            user_wallet_address: Address,
            amount: Nano,
            token_address: Address,
            app_wallet: AppWalletWithPrivateData,
    ) -> None:
        ...

    @abstractmethod
    async def provide_liquidity(
            self,
            ton_amount: Nano,
            jetton_amount: Nano,
            admin_wallet: AppWalletWithPrivateData,
            pool_address: str,
    ) -> None:
        ...

    @abstractmethod
    async def remove_liquidity(
            self,
            ton_amount: Nano,
            jetton_amount: Nano,
            admin_wallet: AppWalletWithPrivateData,
            pool_address: str,
    ) -> None:
        ...

    @abstractmethod
    async def get_pool_reserves(
            self,
            pool_address: Address,
    ) -> tuple[float, float]:
        ...

    @abstractmethod
    async def get_jetton_wallet_address(
            self,
            contract_address: Address,
            target_address: Address) -> Address:
        ...

    @abstractmethod
    async def get_public_key(self, address: str) -> str:
        ...

    @abstractmethod
    async def get_transactions(self, address: str) -> list[TonTransaction]:
        ...

    @abstractmethod
    async def get_current_pool_state(self) -> dict[str, float]:
        ...
