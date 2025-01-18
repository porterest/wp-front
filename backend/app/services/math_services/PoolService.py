from dataclasses import dataclass
from typing import Dict

from abstractions.services.math.pool_service import PoolServiceInterface
from abstractions.services.tonclient import TonClientInterface


@dataclass
class PoolService(PoolServiceInterface):
    ton_client: TonClientInterface

    async def get_current_pool_state(self) -> dict[str, float]:
        return await self.ton_client.get_current_pool_state()
