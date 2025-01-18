from abc import ABC, abstractmethod
from typing import Dict


class PoolServiceInterface(ABC):
    @abstractmethod
    async def get_current_pool_state(self) -> dict[str, float]:
        ...