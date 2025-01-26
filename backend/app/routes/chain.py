import logging

from fastapi import APIRouter, HTTPException

from dependencies.repositories.chain import get_chain_repository
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
    repository = get_chain_repository()
    # todo: может стоит сделать TimeResponse как часть метахолдера?
    #  ну хз как будто уже пиздец бойлерплейт,
    #  но с другой стороны по сути ни один сервис не должен отдавать напрямую модели метахолдера короче хз наверное пох
    try:
        chains = await repository.get_all()
        res = await service.get_current_block_state(chains[0].pair_id)
        logger.info(f"res: {res}")
        return res
    except NotFoundException:
        raise HTTPException(
            status_code=503,
            detail=f"No one block bro",
        )
