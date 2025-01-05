from abstractions.services.dex import DexServiceInterface
from domain.enums.liquidity_action import LiquidityAction


class DexService(DexServiceInterface):
    def get_pool_balances(self) -> float:
        """
        Получает текущее соотношение ликвидности в пуле из внешнего API.
        :return: Соотношение токенов к тонам в пуле.
        """
        # Заглушка для реального запроса к API
        return [12121, 333]

    def get_pool_activity(self) -> float:
        """
        Получает текущее соотношение ликвидности в пуле из внешнего API.
        :return: Соотношение токенов к тонам в пуле.
        """
        # Заглушка для реального запроса к API
        ...

    def perform_swap(self, pool_state_delta: dict[str, float]) -> None:

        """
        Получает текущее соотношение ликвидности в пуле из внешнего API.
        :return: Соотношение токенов к тонам в пуле.
        """
        ...

    def perform_liquidity_action(self, liquidity_action: LiquidityAction, pool_state_delta: dict[str, float]) -> None:

        """
        Получает текущее соотношение ликвидности в пуле из внешнего API.
        :return: Соотношение токенов к тонам в пуле.
        """
        ...

