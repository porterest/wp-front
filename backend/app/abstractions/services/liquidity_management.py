from abc import ABC, abstractmethod
from typing import Annotated

from domain.dex import PoolState
from domain.models.liquidity_action import LiquidityAction
from domain.models.swap import CalculatedSwap


class LiquidityManagerInterface(ABC):
    @abstractmethod
    async def calculate_tokens_deficit_or_surplus(self, current_state: dict, target_state: dict) -> dict:
        """
        Рассчитывает дефицит или профицит токенов.
        """
        ...

        # Решение на основе совокупных данных

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


#
# import asyncio
#
# class MockDexService(DexServiceInterface):
#     async def get_pool_activity(self):
#         return {"trades": 120, "volume": 6000}
#
#     async def get_users_activity(self):
#         return {"bets_count": 40, "users_volume": 2500}
#
#     async def get_swap_volumes(self):
#         return {"swaps": 50, "swap_volume": 4000}
#
#     async def get_pool_state(self):
#         return {"token_x": 850, "token_y": 1950}
#
#     async def get_target_pool_state(self):
#         return {"token_x": 1000, "token_y": 2000}
#
#     async def add_liquidity(self, deficit):
#         return {"message": f"Liquidity added: {deficit}"}
#
#     async def remove_liquidity(self, surplus):
#         return {"message": f"Liquidity removed: {surplus}"}
#
# async def main():
#     dex_service = MockDexService()
#     liquidity_service = LiquidityManagementService(dex_service)
#
#     result = await liquidity_service.manage_liquidity()
#     print(result)
#
# asyncio.run(main())
