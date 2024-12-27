from typing import Tuple

from fastapi import APIRouter

from dependencies.services.block import get_block_service
from dependencies.services.chain import get_chain_service

router = APIRouter(
    prefix='/block',
    tags=['block/']
)


@router.get('/last_vector')
async def get_last_vector(pair_id: str) -> Tuple[float, float]:
    service = get_block_service()
    vector = await service.get_last_block(pair_id)
    return vector.result_vector
