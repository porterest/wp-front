import asyncio
from dataclasses import dataclass

from abstractions.services.liquidity_management import LiquidityManagerInterface
from domain.enums.liquidity_action import LiquidityActionType
from domain.models.liquidity_action import LiquidityAction, TokenState
from settings import settings


@dataclass
class LiquidityManager(LiquidityManagerInterface):
    inner_token_symbol: str

    async def decide_liquidity_action(
            self,
            current_pool_state: dict,
            predicted_price: float,
    ) -> LiquidityAction:
        """
        Регулирует баланс токенов в пуле, чтобы достичь предсказанной цены,
        минимизируя количество токенов в пуле и изменяя только один токен за действие.
        """
        inner_balance = current_pool_state.get(self.inner_token_symbol, 0.0)
        other_token_symbol = (set(current_pool_state.keys()) - {self.inner_token_symbol}).pop()
        other_balance = current_pool_state.get(other_token_symbol, 0.0)

        if other_balance == 0:
            raise ValueError("Баланс другого токена не может быть нулевым.")

        current_price = other_balance / inner_balance if inner_balance > 0 else float('inf')

        if abs(predicted_price - current_price) < 1e-6:
            return LiquidityAction(action=LiquidityActionType.HOLD, states={})

        if predicted_price > current_price:
            # Нужно уменьшить количество inner токена (увеличить цену)
            target_inner_balance = other_balance / predicted_price
            delta_inner = target_inner_balance - inner_balance
            action_type = LiquidityActionType.REMOVE if delta_inner < 0 else LiquidityActionType.ADD

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
                        state_after=other_balance,
                        delta=.0,
                    )
                }
            )
        else:
            # Нужно уменьшить количество other токена (уменьшить цену)
            target_other_balance = inner_balance * predicted_price
            delta_other = target_other_balance - other_balance
            action_type = LiquidityActionType.REMOVE if delta_other < 0 else LiquidityActionType.ADD

            return LiquidityAction(
                action=action_type,
                states={
                    other_token_symbol: TokenState(
                        name=other_token_symbol,
                        state_after=other_balance + delta_other,
                        delta=delta_other
                    ),
                    self.inner_token_symbol: TokenState(
                        name=self.inner_token_symbol,
                        state_after=inner_balance,
                        delta=.0,
                    )
                }
            )


if __name__ == '__main__':
    manager = LiquidityManager(inner_token_symbol=settings.inner_token.symbol)
    current_state = {'TON': 2, 'DD': 10}
    predicted_price = 2.5

    async def main():
        a = await manager.decide_liquidity_action(
            current_pool_state=current_state,
            predicted_price=predicted_price
        )

        print(a)

    asyncio.run(main())
