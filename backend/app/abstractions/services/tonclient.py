from abc import ABC
from abc import abstractmethod
from typing import Annotated

from pytoniq_core import Address

from domain.models.app_wallet import AppWalletWithPrivateData
from domain.ton import InitialAccountState
from domain.ton.transaction import TonTransaction


class TonClientInterface(ABC):
    @staticmethod
    def get_account_address(
            init_state: InitialAccountState,
            workchain_id: int = 0,
    ) -> Annotated[str, 'Address']:
        ...

    @abstractmethod
    async def mint(self, amount: int, token_address: Address, admin_wallet: AppWalletWithPrivateData):
        ...

    @abstractmethod
    async def send_jettons(
            self,
            user_wallet_address: Address,
            amount: int,
            token_address: Address,
            app_wallet: AppWalletWithPrivateData,
    ) -> None:
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
    async def mint_tokens(self, amount: int):
        ...

    @abstractmethod
    async def get_current_pool_state(self) -> dict[str, float]:
        ...
