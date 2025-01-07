from abc import ABC, abstractmethod

from domain.metaholder.responses.candle import Candle
from domain.models.block import Block


class CandleServiceInterface(ABC):

    @abstractmethod
    async def get_candles(self, pair_id: str) -> list[Candle]:
        ...
    @abstractmethod
    async def get_n_last_blocks_by_pair_id(self, pair_id: str, n: int) -> list[Block]:
        ...
