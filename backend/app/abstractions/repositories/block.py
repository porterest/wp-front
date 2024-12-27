from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.block import CreateBlockDTO, UpdateBlockDTO
from domain.models.block import Block


class BlockRepositoryInterface(
    CRUDRepositoryInterface[
        Block, CreateBlockDTO, UpdateBlockDTO,
    ],
    ABC,
):
    @abstractmethod
    async def get_last_block(self, pair_id) -> Optional[Block]:
        pass

    # @abstractmethod
    # async def get(self, block_id: UUID) -> Optional[Block]:
    #     pass

    # @abstractmethod
    # async def update(self, block: Block) -> None:
    #     pass
