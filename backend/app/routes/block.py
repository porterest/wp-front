import logging
from typing import Tuple
from uuid import UUID

from fastapi import APIRouter

from dependencies.services.block import get_block_service

router = APIRouter(
    prefix='/block',
    tags=['block/']
)

logger = logging.getLogger(__name__)
@router.get('/last_vector')
async def get_last_vector(pair_id: UUID) -> Tuple[float, float]:
    service = get_block_service()
    block = await service.get_last_completed_block_by_pair_id(pair_id)
    vector = block.result_vector
    logger.info('ебаный вектор')
    logger.info(vector)
    # if vector == (0, 0):
    #     return (8, 21)
    return vector
