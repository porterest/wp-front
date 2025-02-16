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
    return vector


@router.get('/last_vectors')
async def get_last_vectors(pair_id: UUID, count: int) -> list[Tuple[float, float]]:
    service = get_block_service()
    blocks = await service.get_n_last_active_blocks_by_pair_id(pair_id=pair_id, n=count)
    vectors = [block.result_vector for block in blocks[::-1]]
    return vectors
