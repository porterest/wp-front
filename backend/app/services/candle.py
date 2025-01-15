from typing import List
from uuid import UUID

from abstractions.services.block import BlockServiceInterface
from abstractions.services.candle import CandleServiceInterface
from domain.metaholder.responses.candle import Candle


class CandleService(CandleServiceInterface):
    block_service: BlockServiceInterface

    # async def get_candles(self, pair_id: str) -> List[Candle]:
    #     blocks = self.block_service.get_n_last_blocks_by_pair_id(pair_id=pair_id, n=10)

    async def get_n_last_blocks_by_pair_id(self, pair_id: UUID, n: int):
        return await self.block_service.get_n_last_blocks_by_pair_id(pair_id=pair_id, n=n)
