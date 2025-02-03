from abc import ABC, abstractmethod


class CurrencyServiceInterface(ABC):
    @abstractmethod
    async def convert_ton_to_inner_token(self, amount: float) -> float:
        ...
