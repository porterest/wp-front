from abc import ABC, abstractmethod
from typing import Annotated
from uuid import UUID

from domain.dex import PoolState
from domain.models.liquidity_action import LiquidityAction


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
    async def perform_swap(self, pool_state_delta: dict[str, float]) -> None:
        """
        Получает текущее соотношение ликвидности в пуле из внешнего API.
        :return: Соотношение токенов к тонам в пуле.
        """
        ...

    @abstractmethod
    async def perform_liquidity_action(self, liquidity_action: LiquidityAction, pool_state_delta: dict[str, float]) -> None:

        """
        Получает текущее соотношение ликвидности в пуле из внешнего API.
        :return: Соотношение токенов к тонам в пуле.
        """
        ...

    @abstractmethod
    async def get_current_liquidity(self, pair_id: UUID) -> Annotated[float, 'хуй знает']:
        ...
