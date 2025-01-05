from abc import ABC
from dataclasses import dataclass

from services.TokenEmissionService import TokenEmissionService

@dataclass
class CalculationsTokenEmissionServiceInterface(ABC):
    wallet_balance: float
    pool_balance: float
    emission_service: TokenEmissionService


    def issue_tokens(self, required_tokens: float):
        """
        Выпускает недостающие токены, если баланс кошелька недостаточен.
        :param required_tokens: Количество необходимых токенов.
        :param emission_service: Сервис для работы с эмиссией токенов.
        :return: Количество выпущенных токенов.
        """
        ...

    def adjust_pool_balance(self, aggregated_stake: float, current_pool_state: float, emission_service: 'TokenEmissionService', liquidity_api_client):
        """
        Корректирует баланс пула на основе агрегированной ставки и текущего состояния.
        :param aggregated_stake: Агрегированная ставка пользователей.
        :param current_pool_state: Текущее состояние пула ликвидности.
        :param emission_service: Сервис для работы с эмиссией токенов.
        :param liquidity_api_client: Клиент для получения данных о балансе ликвидности в пуле.
        :return: Действие (выпуск или сжигание токенов) и количество.
        """
        ...
