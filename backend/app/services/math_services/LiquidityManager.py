from dataclasses import dataclass

from abstractions.services.dex import DexServiceInterface
from abstractions.services.liquidity_management import LiquidityManagementServiceInterface
from domain.enums.liquidity_action import LiquidityAction


@dataclass
class LiquidityManager(LiquidityManagementServiceInterface):
    dex_service: DexServiceInterface

    async def calculate_tokens_deficit_or_surplus(self, current_state: dict, target_state: dict) -> dict:
        """
        Рассчитывает дефицит или профицит токенов.
        """
        return {
            "token_x": target_state["token_x"] - current_state["token_x"],
            "token_y": target_state["token_y"] - current_state["token_y"],
        }

        # Решение на основе совокупных данных

    def decide_liquidity_action(self, deficit_or_surplus: dict, pool_trade_intensity: int, swap_volume: int,
                                user_bet_count: int, user_volume: int, swap_count: int) -> LiquidityAction:
        """
        Логика принятия решения по управлению ликвидностью.
        """
        if deficit_or_surplus["token_x"] < 0 or deficit_or_surplus["token_y"] < 0:
            if pool_trade_intensity > 100 and swap_volume > 3000:  # Высокая активность пула
                return LiquidityAction.ADD  # Добавляем ликвидность
            elif user_bet_count < 10:  # Низкая активность пользователей
                return LiquidityAction.HOLD  # Ничего не делаем
        elif deficit_or_surplus["token_x"] > 0 or deficit_or_surplus["token_y"] > 0:
            if user_volume > 2000 and swap_count > 50:  # Высокая пользовательская активность и частые свапы
                return LiquidityAction.REMOVE  # Убираем ликвидность
            else:
                return LiquidityAction.HOLD  # Ничего не делаем

        return LiquidityAction.HOLD  # По умолчанию удерживаем ликвидность

    async def manage_liquidity(self) -> dict:  # todo: remove?
        """
        Управляет ликвидностью на основе анализа пула, пользователей и объемов свапов.
        """
        # Прямые вызовы методов DexService
        pool_activity = await self.dex_service.get_pool_activity()
        users_activity = await self.dex_service.get_users_activity()
        swap_volumes = await self.dex_service.get_swap_volumes()

        # Получаем текущее и целевое состояние пула
        current_state = await self.dex_service.get_pool_state()
        target_state = await self.dex_service.get_target_pool_state()

        # Рассчитываем дефицит или профицит токенов
        deficit_or_surplus = await self.calculate_tokens_deficit_or_surplus(current_state, target_state)

        # Принимаем решение
        action = await self.decide_liquidity_action(deficit_or_surplus, pool_activity, users_activity, swap_volumes)

        # Выполняем действие
        if action == "add":
            result = await self.dex_service.add_liquidity(deficit_or_surplus)
        elif action == "remove":
            result = await self.dex_service.remove_liquidity(deficit_or_surplus)
        else:
            result = {"message": "No liquidity action needed."}

        return result

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
