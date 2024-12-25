from abc import ABC, abstractmethod
from typing import Optional

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
    async def get_last_block(self) -> Optional[Block]:
        pass

    # @abstractmethod
    # async def update(self, block: Block) -> None:
    #     pass
