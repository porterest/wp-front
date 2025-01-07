from typing import List

from abstractions.services.block import BlockServiceInterface
from abstractions.services.candle import CandleServiceInterface
from domain.metaholder.responses.candle import Candle
from services.BlockService import BlockService


class CandleService(CandleServiceInterface):
    block_service: BlockServiceInterface
    async def get_candles(self, pair_id: str) -> List[Candle]:
        blocks = self.block_service.get_n_last_blocks_by_pair_id(pair_id=pair_id, n = 10)
