from abc import ABC, abstractmethod

from domain.models.liquidity_action import LiquidityAction


class LiquidityManagerInterface(ABC):

    @abstractmethod
    async def decide_liquidity_action(
            self,
            current_pool_state: dict,
            predicted_price: float,
    ) -> LiquidityAction:
        """
        Логика принятия решения по управлению ликвидностью.
        """
        ...
