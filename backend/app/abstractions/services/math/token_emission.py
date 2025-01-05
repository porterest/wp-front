from abc import ABC
from dataclasses import dataclass

from abstractions.services.tonclient import TonClientInterface


@dataclass
class TokenEmissionServiceInterface(ABC):
    ton_client: TonClientInterface

    """
    Сервис для работы с эмиссией токенов через TON.
    :param ton_client: Клиент для работы с блокчейном TON.
    """

    def mint_tokens(self, amount: float) -> None:
        """
        Выпуск токенов через TON.
        :param amount: Количество токенов для выпуска.
        """
        ...

    def burn_tokens(self, amount: float) -> None:
        """
        Сжигание токенов через TON.
        :param amount: Количество токенов для сжигания.
        """
        ...