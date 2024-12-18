import logging

from fastapi import APIRouter

from dependencies.services.chain import get_chain_service
from domain.models.block_state import Time

router = APIRouter(
    prefix='/chain',

)

logger = logging.getLogger(__name__)


@router.get('/time')
async def get_time(
) -> Time:
    service = get_chain_service()
    return await service.get_current_block_state()
