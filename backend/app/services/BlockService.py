from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import func

from abstractions.repositories.block import BlockRepositoryInterface
from abstractions.services.bet import BetServiceInterface
from abstractions.services.block import BlockServiceInterface
from domain.dto.block import UpdateBlockDTO, CreateBlockDTO
from domain.models.block import Block
from infrastructure.db.entities import BlockStatus
from services.exceptions import NotFoundException


@dataclass
class BlockService(BlockServiceInterface):
    block_repository: BlockRepositoryInterface
    bet_service: BetServiceInterface

    async def create(self, create_dto):
        await self.block_repository.create(create_dto)


    async def get_last_block(self, chain_id: UUID) -> Optional[Block]:
        last_block = await self.block_repository.get_last_block(chain_id)
        return last_block
    async def get_last_block_by_pair_name(self, name: str) -> Optional[Block]:
        last_block = await self.block_repository.get_last_block_by_pair_name(name)
        return last_block
    async def handle_interrupted_block(self, block_id: UUID) -> None:
        update_block = UpdateBlockDTO(
            status=BlockStatus.INTERRUPTED,
         )
        await self.block_repository.update(block_id, update_block)
        block = await self.block_repository.get(block_id)
        # Отменяем ставки в прерванном блоке
        for bet in block.bets:
            await self.bet_service.cancel_bet(bet.id)

    async def start_new_block(self, block_number: int) -> Block:
        last_block = await self.get_last_block()
        if last_block:
            block = CreateBlockDTO(
                block_number=last_block.block_number + 1,
                status=BlockStatus.IN_PROGRESS,
                result_vector=None,
                created_at=datetime.now(),
            )
        else:
            block = CreateBlockDTO(
                block_number=1,
                status=BlockStatus.IN_PROGRESS,
                result_vector=None,
                created_at=datetime.now(),
            )

        await self.block_repository.create(block)
        block = await self.block_repository.get(block.id)
        return block

    async def complete_block(self, block_id: UUID) -> None:
        block = await self.get_block_by_id(block_id)
        update_block = (
            UpdateBlockDTO(
                status=BlockStatus.COMPLETED,
                result_vector=block.result_vector,
                completed_at=block.completed_at
            )
        )
        block.status = BlockStatus.COMPLETED
        block.completed_at = func.now()
        await self.block_repository.update(block_id, update_block)

    async def get_block_by_id(self, block_id: UUID) -> Block:
        block = await self.block_repository.get(block_id)
        if not block:
            raise NotFoundException(f"Block with ID {block_id} not found")
        return block

    async def rollback_block(self, block: Block) -> None:
        # Implement rollback logic here
        update_block= UpdateBlockDTO(
            status=BlockStatus.COMPLETED,
            result_vector=block.result_vector,
            completed_at=None,
        )
        block.status = BlockStatus.COMPLETED
        await self.block_repository.update(block.id, update_block)
