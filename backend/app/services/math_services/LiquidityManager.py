from dataclasses import dataclass

from abstractions.services.dex import DexServiceInterface
from abstractions.services.liquidity_management import LiquidityManagerInterface
from domain.enums.liquidity_action import LiquidityActionType
from domain.models.liquidity_action import LiquidityAction, TokenState

@dataclass
class LiquidityManager(LiquidityManagerInterface):
    dex_service: DexServiceInterface
    inner_token_symbol: str

    async def decide_liquidity_action(
        self,
        current_pool_state: dict,
        predicted_price: float,
    ) -> LiquidityAction:
        """
        Регулирует баланс обоих токенов в пуле, чтобы достичь предсказанной цены.
        """
        inner_balance = current_pool_state.get(self.inner_token_symbol, 0.0)
        other_token_symbol = (set(current_pool_state.keys()) - {self.inner_token_symbol}).pop()
        other_balance = current_pool_state.get(other_token_symbol, 0.0)

        # Если other_balance равен 0, корректировка невозможна
        if other_balance == 0:
            raise ValueError("Баланс другого токена не может быть нулевым.")

        # Найти целевые балансы для достижения предсказанной цены
        total_liquidity = inner_balance + other_balance
        target_inner_balance = (predicted_price / (1 + predicted_price)) * total_liquidity
        target_other_balance = total_liquidity - target_inner_balance

        # Рассчитать дельты для обоих токенов
        delta_inner = target_inner_balance - inner_balance
        delta_other = target_other_balance - other_balance

        # Определяем действие (добавить/убрать токены)
        action_type = (
            LiquidityActionType.HOLD if abs(delta_inner) < 1e-6 and abs(delta_other) < 1e-6 else
            LiquidityActionType.ADD if delta_inner > 0 else
            LiquidityActionType.REMOVE
        )

        # Формируем результат действия
        return LiquidityAction(
            action=action_type,
            states={
                self.inner_token_symbol: TokenState(
                    name=self.inner_token_symbol,
                    state_after=inner_balance + delta_inner,
                    delta=delta_inner
                ),
                other_token_symbol: TokenState(
                    name=other_token_symbol,
                    state_after=other_balance + delta_other,
                    delta=delta_other
                )
            }
        )

    async def calculate_tokens_deficit_or_surplus(self, current_state: dict, target_state: dict) -> dict:
        """
        Рассчитывает дефицит или профицит токенов.
        """
        ...
