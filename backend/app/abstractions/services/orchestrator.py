from abc import ABC, abstractmethod
from uuid import UUID

from domain.models.orchestrator_result import OrchestratorResult


class OrchestratorServiceInterface(ABC):
    @abstractmethod
    async def process_block(self, block_id: UUID) -> OrchestratorResult:
        ...
