from typing import Tuple
from uuid import UUID

from fastapi import APIRouter

from dependencies.services.block import get_block_service

router = APIRouter(
    prefix='/block',
    tags=['block/']
)


@router.get('/last_vector')
async def get_last_vector(pair_id: UUID) -> Tuple[float, float]:
    service = get_block_service()
    block = await service.get_last_block_by_pair_name()
    vector = block.result_vector
    if not vector:
        return (2, 3)
    return vector.result_vector
