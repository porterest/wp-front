from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from domain.models.block import Block
from domain.models.reward_model import Rewards


class BlockServiceInterface(ABC):
    @abstractmethod
    async def get_last_block(self, chain_id: UUID) -> Optional[Block]:
        """
        Возвращает последний блок в системе.
        """
        ...

    @abstractmethod
    async def start_new_block(self, chain_id: UUID) -> Optional[Block]:
        """
        Возвращает последний блок в системе.
        """
        ...

    async def get_n_last_active_blocks_by_pair_id(self, pair_id: UUID, n: int) -> Optional[list[Block]]:
        """
        Возвращает последний блок в системе.
        """
        ...

    @abstractmethod
    async def get_block(self, block_id: UUID) -> Optional[Block]:
        """
        Возвращает последний блок в системе.
        """
        ...

    @abstractmethod
    async def get_last_block_by_pair_id(self, pair_id: UUID) -> Optional[Block]:
        """
        Возвращает последний блок в системе по имени пары.
        """
        ...

    @abstractmethod
    async def get_last_completed_block_by_pair_id(self, pair_id: UUID) -> Optional[Block]:
        """
        Возвращает последний блок в системе по имени пары.
        """
        ...

    @abstractmethod
    async def complete_block(self, block_id: UUID) -> None:
        """
        Помечает блок как завершённый.
        """
        ...

    @abstractmethod
    async def process_completed_block(self, block: Block, rewards: Rewards, new_block_id: UUID) -> None:
        ...

    @abstractmethod
    async def handle_interrupted_block(self, block_id: UUID) -> None:
        """
        Обрабатывает последний блок, если он имеет статус `INTERRUPTED`.
        """
        ...
