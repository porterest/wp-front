from typing import Tuple

from fastapi import APIRouter

from dependencies.services.block import get_block_service

router = APIRouter(
    prefix='/block',
    tags=['block/']
)


@router.get('/last_vector')
async def get_last_vector() -> Tuple[float, float]:
    service = get_block_service()
    vector = await service.get_last_block()
    return vector.result_vector
