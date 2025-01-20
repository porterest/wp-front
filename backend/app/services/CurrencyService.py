from dataclasses import dataclass

from abstractions.services.currency import CurrencyServiceInterface


@dataclass
class CurrencyService(CurrencyServiceInterface):

    async def convert_ton_to_inner_token(self, amount: int) -> float:
        ...
