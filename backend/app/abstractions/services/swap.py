from abc import ABC, abstractmethod
from uuid import UUID

from domain.dex.pool import PoolBalances
from domain.models.swap import CalculatedSwap


class SwapServiceInterface(ABC):
    @abstractmethod
    async def get_swap_score(self, pair_id: UUID) -> float:
        pass

    @abstractmethod
    async def calculate_swap(
            self,
            current_price: float,
            current_state: PoolBalances,
            target_price_change: float,
    ) -> CalculatedSwap:
        pass

    @abstractmethod
    async def swap_deposit(self, deposit_id: UUID) -> None:
        pass

    @abstractmethod
    async def bet_swap(self, calculated_swap: CalculatedSwap, pair_id: UUID) -> None:
        ...
