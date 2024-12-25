import logging

from fastapi import APIRouter, HTTPException

from dependencies.services.chain import get_chain_service
from domain.metaholder.responses.block_state import BlockStateResponse
from services.exceptions import NotFoundException

router = APIRouter(
    prefix='/chain',

)

logger = logging.getLogger(__name__)


@router.get('/time')
async def get_time(
) -> BlockStateResponse:
    service = get_chain_service()
    # todo: может стоит сделать TimeResponse как часть метахолдера?
    #  ну хз как будто уже пиздец бойлерплейт,
    #  но с другой стороны по сути ни один сервис не должен отдавать напрямую модели метахолдера короче хз наверное пох
    try:
        return await service.get_current_block_state()
    except NotFoundException:
        raise HTTPException(
            status_code=588,  # AAAAAAAA
            detail=f"No one block bro",
        )
