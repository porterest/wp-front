from abc import ABC


class CurrencyServiceInterface(ABC):


    async def convert_ton_to_inner_token(self, amount: float) -> float:
        return 100.5
    #todo