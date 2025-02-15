from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.block import CreateBlockDTO, UpdateBlockDTO
from domain.metaholder.responses.block_state import BlockStateResponse
from domain.models.block import Block


class BlockRepositoryInterface(
    CRUDRepositoryInterface[
        Block, CreateBlockDTO, UpdateBlockDTO,
    ],
    ABC,
):
    @abstractmethod
    async def get_last_block(self, chain_id: UUID) -> Optional[Block]:
        pass

    @abstractmethod
    async def get_last_completed_block(self, chain_id: UUID) -> Optional[Block]:
        ...

    @abstractmethod
    async def get_n_last_active_blocks_by_pair_id(self, n: int, pair_id: UUID) -> Optional[list[Block]]:
        pass

    @abstractmethod
    async def get_last_block_by_pair_id(self, pair_id: UUID) -> Optional[Block]:
        ...

    @abstractmethod
    async def get_last_completed_block_by_pair_id(self, pair_id: UUID) -> Optional[Block]:
        ...

    @abstractmethod
    async def get_previous_block(self, block: Block) -> Block:
        ...

    @abstractmethod
    async def get_last_block_by_contract_address(self, contract_address: str) -> Optional[Block]:
        ...

    @abstractmethod
    async def get_current_block_state(self, pair_id: UUID) -> BlockStateResponse:
        ...

