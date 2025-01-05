from abc import ABC
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID


@dataclass
class AggregateBetsServiceInterface(ABC):
    async def aggregate_bets(self, block_id: UUID) -> tuple[Annotated[float, 'x'], Annotated[float, 'y']]:
        ...
