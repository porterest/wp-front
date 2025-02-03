from dataclasses import dataclass

from abstractions.services.currency import CurrencyServiceInterface
from abstractions.services.inner_token import InnerTokenInterface


@dataclass
class CurrencyService(CurrencyServiceInterface):
    inner_token_service: InnerTokenInterface

    pool_address: str = 'EQCsJuz0ilim-brei8rjwx9KMg3pUVD9Iviyxvzt7ge3Ik46'

    async def convert_ton_to_inner_token(self, amount: float) -> float:
        return amount / await self.inner_token_service.get_token_price(self.pool_address)
