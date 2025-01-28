from dataclasses import dataclass
from uuid import UUID

from abstractions.services.block import BlockServiceInterface
from abstractions.services.candle import CandleServiceInterface


@dataclass
class CandleService(CandleServiceInterface):
    block_service: BlockServiceInterface

    async def get_n_last_blocks_by_pair_id(self, pair_id: UUID, n: int):
        return await self.block_service.get_n_last_active_blocks_by_pair_id(pair_id=pair_id, n=n)
