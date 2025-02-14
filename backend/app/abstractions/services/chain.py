from abc import ABC, abstractmethod
from uuid import UUID

from domain.metaholder.responses.block_state import BlockStateResponse
from domain.models.chain import Chain


class ChainServiceInterface(ABC):
    @abstractmethod
    async def start_block_generation(self) -> None:
        """
        Запускает процесс блокогенерации каждые 10 минут.
        """
        ...

    # @abstractmethod
    # async def get_current_block_state(self, pair_id: UUID) -> BlockStateResponse:
    #     """
    #     Возвращает текущее состояние текущего блока, включая таймер для фронта.
    #     """
    #     ...

    @abstractmethod
    async def stop_block_generation(self) -> None:
        """
        Останавливает процесс блокогенерации.
        """
        ...

    @abstractmethod
    async def get_by_pair_id(self, pair_id: UUID) -> Chain:
        """
        52
        """
        ...
