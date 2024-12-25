class TokenEmissionService:
    def __init__(self, ton_client):
        """
        Сервис для работы с эмиссией токенов через TON.
        :param ton_client: Клиент для работы с блокчейном TON.
        """
        self.ton_client = ton_client

    def mint_tokens(self, amount: float):
        """
        Выпуск токенов через TON.
        :param amount: Количество токенов для выпуска.
        """
        self.ton_client.mint_tokens(amount)

    def burn_tokens(self, amount: float):
        """
        Сжигание токенов через TON.
        :param amount: Количество токенов для сжигания.
        """
        self.ton_client.burn_tokens(amount)