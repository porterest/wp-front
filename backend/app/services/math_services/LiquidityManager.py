from dataclasses import dataclass
from typing import Annotated

from abstractions.services.dex import DexServiceInterface
from abstractions.services.liquidity_management import LiquidityManagerInterface
from domain.dex import PoolState
from domain.enums.liquidity_action import LiquidityActionType
from domain.models.liquidity_action import LiquidityAction, TokenState
from domain.models.swap import CalculatedSwap
from services.math_services.exceptions import TooLittleLiquidityException


@dataclass
class LiquidityManager(LiquidityManagerInterface):
    dex_service: DexServiceInterface

    inner_token_symbol: str

    async def calculate_tokens_deficit_or_surplus(self, current_state: dict, target_state: dict) -> dict:
        """
        Рассчитывает дефицит или профицит токенов.
        """
        return {
            "token_x": target_state["token_x"] - current_state["token_x"],
            "token_y": target_state["token_y"] - current_state["token_y"],
        }

        # Решение на основе совокупных данных

    def analyze_deficit(self, other_token_state, other_token_balance):
        """
        Анализ дефицита внешнего токена.
        """
        if other_token_state < 0:
            required_liquidity = abs(other_token_state)
            if required_liquidity <= other_token_balance:
                return LiquidityActionType.REMOVE, required_liquidity
            else:
                raise TooLittleLiquidityException("Insufficient other token liquidity in pool")
        return None, 0

    def calculate_adaptive_delta(self, base_value, intensity_factor):
        """
        Рассчитывает адаптивное значение delta.
        """
        return base_value * intensity_factor

    def decide_liquidity_action(
            self,
            inner_token_state: Annotated[float, 'inner token needed'],
            other_token_state: Annotated[float, 'other pool token needed'],
            pool_trade_intensity: Annotated[float, 'pool trade intensity score'],
            pool_state: Annotated[PoolState, 'current pool state'],
            calculated_swap: Annotated[CalculatedSwap, 'calculated swap of the current block'],
            swaps_volume_score: Annotated[float, 'how hard it is to move price'],
            bets_count: Annotated[int, 'bets count within the block'],
            bets_volume: Annotated[float, 'bets volume within the block'],
    ) -> LiquidityAction:
        """
        Гибкая логика принятия решения по управлению ликвидностью.
        """
        inner_token_balance = pool_state.balances.get(self.inner_token_symbol, 0.0)
        other_token_symbol = (set(pool_state.balances.keys()) - {self.inner_token_symbol}).pop()
        other_token_balance = pool_state.balances.get(other_token_symbol, 0.0)

        # 1. Анализ дефицита внешнего токена
        action, required_liquidity = self.analyze_deficit(other_token_state, other_token_balance)
        if action == LiquidityActionType.REMOVE:
            return LiquidityAction(
                action=action,
                states={
                    other_token_symbol: TokenState(
                        name=other_token_symbol,
                        state_after=other_token_balance - required_liquidity,
                        delta=-required_liquidity
                    ),
                    self.inner_token_symbol: TokenState(
                        name=self.inner_token_symbol,
                        state_after=inner_token_balance,
                        delta=0
                    )
                }
            )

        # 2. Адаптивное добавление ликвидности
        if pool_trade_intensity > 0.8:
            adaptive_delta = self.calculate_adaptive_delta(1000, pool_trade_intensity)
            return LiquidityAction(
                action=LiquidityActionType.ADD,
                states={
                    self.inner_token_symbol: TokenState(
                        name=self.inner_token_symbol,
                        state_after=inner_token_balance + adaptive_delta,
                        delta=adaptive_delta
                    ),
                    other_token_symbol: TokenState(
                        name=other_token_symbol,
                        state_after=other_token_balance,
                        delta=0
                    )
                }
            )

        # 3. Уменьшение ликвидности при низкой активности
        if swaps_volume_score < 0.5:
            adaptive_delta = self.calculate_adaptive_delta(500, 1 - swaps_volume_score)
            return LiquidityAction(
                action=LiquidityActionType.REMOVE,
                states={
                    self.inner_token_symbol: TokenState(
                        name=self.inner_token_symbol,
                        state_after=inner_token_balance - adaptive_delta,
                        delta=-adaptive_delta
                    ),
                    other_token_symbol: TokenState(
                        name=other_token_symbol,
                        state_after=other_token_balance,
                        delta=0
                    )
                }
            )

        # 4. Держим ликвидность при сбалансированной системе
        return LiquidityAction(
            action=LiquidityActionType.HOLD,
            states={
                self.inner_token_symbol: TokenState(
                    name=self.inner_token_symbol,
                    state_after=inner_token_balance,
                    delta=0
                ),
                other_token_symbol: TokenState(
                    name=other_token_symbol,
                    state_after=other_token_balance,
                    delta=0
                )
            }
        )

        # if deficit_or_surplus["token_x"] < 0 or deficit_or_surplus["token_y"] < 0:
        #     if pool_trade_intensity > 100 and last_swaps_volume > 3000:  # Высокая активность пула
        #         return LiquidityAction.ADD  # Добавляем ликвидность
        #     elif bets_count < 10:  # Низкая активность пользователей
        #         return LiquidityAction.HOLD  # Ничего не делаем
        # elif deficit_or_surplus["token_x"] > 0 or deficit_or_surplus["token_y"] > 0:
        #     if bets_volume > 2000 and last_swaps_volume > 50:  # Высокая пользовательская активность и частые свапы
        #         return LiquidityAction.REMOVE  # Убираем ликвидность
        #     else:
        #         return LiquidityAction.HOLD  # Ничего не делаем
        #
        # return LiquidityAction.HOLD  # По умолчанию удерживаем ликвидность

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
