from abc import ABC
from dataclasses import dataclass
from uuid import UUID

from domain.models.bet import BetVector


@dataclass
class AggregateBetsServiceInterface(ABC):
    async def aggregate_bets(
            self,
            block_id: UUID,
    ) -> BetVector:
        ...
