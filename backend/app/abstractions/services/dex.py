from abc import ABC, abstractmethod
from typing import Annotated
from uuid import UUID

from domain.dex import PoolState
from domain.models.liquidity_action import LiquidityAction
from domain.ton.transaction import TonTransaction


class DexServiceInterface(ABC):
    @abstractmethod
    async def get_pool_balance(self) -> tuple[float, float]:
        ...

    @abstractmethod
    async def burn_lp_tokens(self):
        ...

    @abstractmethod
    async def get_pool_state(self) -> PoolState:
        ...

    @abstractmethod
    async def get_pool_activity(self, pair_id: UUID) -> Annotated[float, 'pool trade intensity score']:
        ...

    @abstractmethod
    async def perform_liquidity_action(self, liquidity_action: LiquidityAction) -> None:
        ...

    @abstractmethod
    async def get_current_liquidity(self, pair_id: UUID) -> Annotated[float, 'хуй знает']:
        ...

    @abstractmethod
    async def perform_swap(
            self,
            pool_address: str,
            target_token: str,
            amount: float,
            app_wallet_id: UUID,
    ) -> TonTransaction:
        ...
