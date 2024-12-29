from abc import ABC, abstractmethod
from uuid import UUID
from typing import Optional

from domain.dto.block import CreateBlockDTO
from domain.models.block import Block


class BlockServiceInterface(ABC):
    @abstractmethod
    async def get_last_block(self, chain_id: UUID) -> Optional[Block]:
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
    async def create(self, create_dto: CreateBlockDTO) -> None:
        ...


    @abstractmethod
    async def start_new_block(self, block_number: int) -> Block:
        """
        Создаёт новый блок с указанным номером.
        """
        ...

    @abstractmethod
    async def complete_block(self, block_id: UUID) -> None:
        """
        Помечает блок как завершённый.
        """
        ...


    @abstractmethod
    async def handle_interrupted_block(self, block: Block) -> None:
        """
        Обрабатывает последний блок, если он имеет статус `INTERRUPTED`.
        """
        ...

    @abstractmethod
    async def rollback_block(self, block: Block) -> None:
        """
        Выполняет откат или обработку прерванного блока.
        """
        ...


