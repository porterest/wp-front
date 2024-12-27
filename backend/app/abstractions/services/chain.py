from abc import ABC, abstractmethod
from typing import Dict, Any
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

    @abstractmethod
    async def _generate_new_blocks(self) -> None:
        """
        Основная логика генерации нового блока.
        """
        ...

    @abstractmethod
    async def _handle_interrupted_block(self, block: Any) -> None:
        """
        Обрабатывает прерванный блок.
        """
        ...

    @abstractmethod
    async def _create_new_block(self, chain: Chain) -> None:
        """
        Создаёт новый блок и сохраняет его в базе данных.
        """
        ...

    @abstractmethod
    async def get_current_block_state(self, chain_id: UUID) -> BlockStateResponse:
        """
        Возвращает текущее состояние текущего блока, включая таймер для фронта.
        """
        ...

    @abstractmethod
    def stop_block_generation(self) -> None:
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
