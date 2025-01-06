from abc import ABC, abstractmethod
from typing import Annotated

from abstractions.services.dex import DexServiceInterface
from domain.models.liquidity_action import LiquidityAction


class LiquidityManagementServiceInterface(ABC):
    dex_service: DexServiceInterface

    @abstractmethod
    async def calculate_tokens_deficit_or_surplus(self, current_state: dict, target_state: dict) -> dict:
        """
        Рассчитывает дефицит или профицит токенов.
        """
        ...

        # Решение на основе совокупных данных

    @abstractmethod
    def decide_liquidity_action(
            self,
            inner_token_state: Annotated[float, 'inner token needed'],
            other_token_state: Annotated[float, 'other pool token needed'],
            pool_trade_intensity: Annotated[float, 'pool trade intensity score'],
            swaps_volume_score: Annotated[float, 'how hard it is to move price'],
            bets_count: Annotated[int, 'bets count within the block'],
            bets_volume: Annotated[float, 'bets volume within the block'],
    ) -> LiquidityAction:
        """
        Логика принятия решения по управлению ликвидностью.
        """
        ...

    @abstractmethod
    async def manage_liquidity(self) -> dict:
        """
        Управляет ликвидностью на основе анализа пула, пользователей и объемов свапов.
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
