from typing import List

from fastapi import APIRouter, HTTPException

from dependencies.repositories.pair import get_pair_repository
from domain.metaholder.responses.pair import PairResponse
from services.exceptions import NotFoundException

router = APIRouter(
    prefix='/pair',
    tags=['Pair'],
)


@router.get('')
async def get_pairs_list() -> List[PairResponse]:
    try:
        pairs = get_pair_repository()
        # todo: сделать ли сервис ради этой строки
        return [PairResponse(name=x.name, pair_id=x.id) for x in await pairs.get_all()]
    except NotFoundException:
        raise HTTPException(
            status_code=404,
            detail=f"No one pair bro",
        )
