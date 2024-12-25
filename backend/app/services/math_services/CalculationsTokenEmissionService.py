from datetime import datetime

from domain.dto.prediction import CreatePredictionDTO
from domain.dto.user_prediction import CreateUserPredictionDTO
from services.math_services.LiquidityApiClient import LiquidityApiClient
from services.math_services.TokenEmissionService import TokenEmissionService

class CalculationsTokenEmissionService:
    def __init__(self, wallet_balance: float, pool_balance: float):
        """
        Инициализация сервиса эмиссии токенов.
        :param wallet_balance: Баланс кошелька системы.
        :param pool_balance: Баланс ликвидного пула.
        """
        self.wallet_balance = wallet_balance
        self.pool_balance = pool_balance

    def issue_tokens(self, required_tokens: float, emission_service: 'TokenEmissionService'):
        """
        Выпускает недостающие токены, если баланс кошелька недостаточен.
        :param required_tokens: Количество необходимых токенов.
        :param emission_service: Сервис для работы с эмиссией токенов.
        :return: Количество выпущенных токенов.
        """
        if self.wallet_balance >= required_tokens:
            return 0.0  # Токены не нужно выпускать

        issued_tokens = required_tokens - self.wallet_balance
        self.wallet_balance += issued_tokens

        # Вызов метода выпуска токенов
        emission_service.mint_tokens(issued_tokens)
        return issued_tokens

    def adjust_pool_balance(self, aggregated_stake: float, current_pool_state: float, emission_service: 'TokenEmissionService', liquidity_api_client):
        """
        Корректирует баланс пула на основе агрегированной ставки и текущего состояния.
        :param aggregated_stake: Агрегированная ставка пользователей.
        :param current_pool_state: Текущее состояние пула ликвидности.
        :param emission_service: Сервис для работы с эмиссией токенов.
        :param liquidity_api_client: Клиент для получения данных о балансе ликвидности в пуле.
        :return: Действие (выпуск или сжигание токенов) и количество.
        """
        difference = abs(aggregated_stake - current_pool_state)

        # Получение балансов токена и тона в пуле
        token_balance, ton_balance = liquidity_api_client.get_pool_balances()

        # Вычисление пропорции токенов и тонов
        total_pool = token_balance + ton_balance
        token_ratio = token_balance / total_pool
        ton_ratio = ton_balance / total_pool

        if aggregated_stake > current_pool_state:
            # Рассчитываем количество токенов и тонов для обеспечения ликвидности
            tokens_to_issue = difference * token_ratio
            tons_to_add = difference * ton_ratio

            # Выпуск токенов и использование тонов
            self.pool_balance += tokens_to_issue
            self.wallet_balance -= tons_to_add

            emission_service.mint_tokens(tokens_to_issue)
            print(f"Taking {tons_to_add} TONs from wallet.")
            return "issue", tokens_to_issue
        elif aggregated_stake < current_pool_state:
            # Сжигание токенов для стабилизации
            tokens_to_burn = min(difference, self.pool_balance)
            self.pool_balance -= tokens_to_burn
            emission_service.burn_tokens(tokens_to_burn)
            return "burn", tokens_to_burn

        return "none", 0.0


# Пример использования
if __name__ == "__main__":
    class TonClientMock:
        def mint_tokens(self, amount):
            print(f"Minting {amount} tokens.")

        def burn_tokens(self, amount):
            print(f"Burning {amount} tokens.")

    ton_client = TonClientMock()
    liquidity_api_client = LiquidityApiClient()
    calculations_service = CalculationsTokenEmissionService(wallet_balance=1000.0, pool_balance=500.0)
    emission_service = TokenEmissionService(ton_client=ton_client)

    prediction = CreatePredictionDTO(
        user_predictions=[
            CreateUserPredictionDTO(
                user_id='user_1',
                stake=100,
                predicted_price_change=10,
                predicted_tx_count=50
            ),
            CreateUserPredictionDTO(
                user_id='user_2',
                stake=200,
                predicted_price_change=15,
                predicted_tx_count=60
            ),
            CreateUserPredictionDTO(
                user_id='user_3',
                stake=150,
                predicted_price_change=8,
                predicted_tx_count=45
            ),
        ],
        actual_price_change=12,
        actual_tx_count=50,
        created_at=datetime.now(),
        updated_at=None
    )

    # Выпуск недостающих токенов
    tokens_issued = calculations_service.issue_tokens(1200, emission_service=emission_service)
    print(f"Tokens issued: {tokens_issued:.2f}")

    # Корректировка баланса пула
    action, amount = calculations_service.adjust_pool_balance(
        aggregated_stake=600,
        current_pool_state=500,
        emission_service=emission_service,
        liquidity_api_client=liquidity_api_client
    )
    print(f"Pool adjustment action: {action}, amount: {amount:.2f}")
