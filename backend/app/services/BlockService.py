from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func

from abstractions.repositories.block import BlockRepositoryInterface
from abstractions.services.block import BlockServiceInterface
from domain.models.block import Block
from infrastructure.db.entities import BlockStatus
from services.exceptions import NotFoundException


@dataclass
class BlockService(BlockServiceInterface):
    block_repository: BlockRepositoryInterface

    async def get_last_block(self) -> Block:
        last_block = await self.block_repository.get_last_block()
        if not last_block:
            raise NotFoundException("No blocks found")
        return last_block

    async def start_new_block(self, block_number: int) -> Block:
        new_block = Block(block_number=block_number, status=BlockStatus.IN_PROGRESS)
        await self.block_repository.save(new_block)
        return new_block

    async def complete_block(self, block_id: UUID) -> None:
        block = await self.get_block_by_id(block_id)
        block.status = BlockStatus.COMPLETED
        block.completed_at = func.now()
        await self.block_repository.update(block)

    async def get_block_by_id(self, block_id: UUID) -> Block:
        block = await self.block_repository.get(block_id)
        if not block:
            raise NotFoundException(f"Block with ID {block_id} not found")
        return block

    async def handle_interrupted_block(self) -> None:
        last_block = await self.get_last_block()
        if last_block.status == BlockStatus.INTERRUPTED:
            # Custom logic to clean up or roll back user bets
            await self.rollback_block(last_block)

    async def rollback_block(self, block: Block) -> None:
        # Implement rollback logic here
        block.status = BlockStatus.COMPLETED
        await self.block_repository.update(block)
