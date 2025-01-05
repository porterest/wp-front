from abstractions.services.token_emission import TokenEmissionServiceInterface
from abstractions.services.tonclient import TonClientInterface


class TokenEmissionService(TokenEmissionServiceInterface):
    ton_client: TonClientInterface
    """
    Сервис для работы с эмиссией токенов через TON.
    :param ton_client: Клиент для работы с блокчейном TON.
    """


    def mint_tokens(self, amount: int):
        """
        Выпуск токенов через TON.
        :param amount: Количество токенов для выпуска.
        """
        self.ton_client.mint_tokens(amount)

    def burn_tokens(self, amount: int):
        """
        Сжигание токенов через TON.
        :param amount: Количество токенов для сжигания.
        """
        self.ton_client.burn_tokens(amount)