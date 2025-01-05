from abc import ABC, abstractmethod

from domain.enums.liquidity_action import LiquidityAction


class DexServiceInterface(ABC):
    @abstractmethod
    async def get_pool_balance(self) -> tuple[float, float]:
        ...

    @abstractmethod
    async def provide_liquidity(self):
        ...

    @abstractmethod
    async def burn_lp_tokens(self):
        ...

    @abstractmethod
    async def get_pool_state(self):
        ...

    @abstractmethod
    async def get_pool_activity(self):
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