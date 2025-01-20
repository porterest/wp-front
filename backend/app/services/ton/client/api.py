import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime
from typing import Tuple, List, Optional

from httpx import AsyncClient
from pydantic import SecretStr

from abstractions.services.tonclient import TonClientInterface
from domain.ton.transaction import TonTransaction, TonTransactionStatus
from services.ton.public_keys.api import TonApiPublicKeyResponse
from services.ton.public_keys.exceptions import PublicKeyCannotBeFetchedException

logger = logging.getLogger(__name__)


@dataclass
class TonApiClient(TonClientInterface):
    token: SecretStr
    base_url: str = 'https://tonapi.io'

    get_address_endpoint: str = ''
    get_pubkey_endpoint: str = '/v2/accounts/{}/publickey'
    get_transactions_endpoint: str = '/v2/blockchain/accounts/{}/transactions'
    lt_file: str = "storage/last_lt.txt"
    @asynccontextmanager
    async def _get_client(self) -> AsyncClient:
        async with AsyncClient(base_url=self.base_url) as client:
            yield client

    def _get_public_key_endpoint(self, address: str):
        return self.get_pubkey_endpoint.replace('{}', address)

    def _get_transactions_endpoint(self, address: str):
        return self.get_transactions_endpoint.replace('{}', address)

    async def get_public_key(self, address: str) -> str:
        async with self._get_client() as client:  # type: AsyncClient
            response = await client.get(
                url=self._get_public_key_endpoint(address),
            )
        if not response.is_success:
            logger.error(f"Failed to fetch {address} public key via API")
            raise PublicKeyCannotBeFetchedException()

        response = TonApiPublicKeyResponse.model_validate(response.json())
        return response.public_key

    async def get_current_pool_state(self) -> dict[str, float]:
        return {'X': 123.1, 'TON': 132.456}



    def _load_last_lt(self) -> Optional[int]:
        """Загружает значение last_lt из файла."""
        try:
            with open(self.lt_file, "r") as file:
                return int(file.read().strip())
        except (FileNotFoundError, ValueError):
            return None

    def _save_last_lt(self, last_lt: int):
        """Сохраняет значение last_lt в файл."""
        with open(self.lt_file, "w") as file:
            file.write(str(last_lt))

    async def get_transactions(self, app_wallet_address: str) -> List[TonTransaction]:
        """
        Возвращает список объектов TonTransaction, представляющих успешные транзакции на кошелек приложения.
        """
        last_lt = self._load_last_lt()  # Загружаем last_lt из файла

        async with self._get_client() as client:  # type: AsyncClient
            params = {}
            if last_lt:
                params["after_lt"] = last_lt

            response = await client.get(
                url=self._get_transactions_endpoint(app_wallet_address),
                params=params
            )

        if not response.is_success:
            logger.error(f"Failed to fetch {app_wallet_address} public key via API")
            raise PublicKeyCannotBeFetchedException()

        transactions_from_response = response.json().get('transactions')

        # response_data = TonApiPublicKeyResponse.model_validate(response.json())

        transactions = []  # Список для хранения объектов TonTransaction
        logger.info(f"response is {type(transactions_from_response)}")
        # logger.info(transactions_from_response)
        for transaction in transactions_from_response:
            if transaction['success'] and not transaction['aborted'] and transaction['in_msg']:
                in_msg = transaction['in_msg']
                if in_msg['msg_type'] == 'ext_in_msg':
                    continue

                logger.info(in_msg)
                transactions.append(TonTransaction(
                    from_address=in_msg['source']['address'],
                    to_address=app_wallet_address,
                    amount=int(in_msg['value']),
                    token='TON',
                    sent_at=datetime.fromtimestamp(transaction['utime']),
                    status=TonTransactionStatus.COMPLETED,
                    tx_id=transaction['hash']
                ))

        # Обновление последнего lt после обработки транзакций
        if transactions_from_response:
            new_last_lt = transactions_from_response[0].lt
            self._save_last_lt(new_last_lt)  # Сохраняем обновленный last_lt в файл

        return transactions
# import logging
# from dataclasses import dataclass
# from enum import Enum
#
# from pydantic import SecretStr
#
# from abstractions.services.tonclient import TonClientInterface


# class HTTPMethod(Enum):
#     GET = 'get'
#     POST = 'post'
#
#
# logger = logging.getLogger(__name__)
#
#
# @dataclass
# class MockTonApiClient(TonClientInterface):
#     token: SecretStr
#     base_url: str = 'https://tonapi.io'
#
#     async def get_public_key(self, address: str) -> str:
#         logger.info(f"Mocking public key retrieval for address: {address}")
#         return "mocked_public_key"
#
#
# # Usage example
# async def main():
#     mock_client = MockTonApiClient(token="dummy_token")
#     public_key = await mock_client.get_public_key("dummy_address")
#     logger.info(f"Retrieved mocked public key: {public_key}")
