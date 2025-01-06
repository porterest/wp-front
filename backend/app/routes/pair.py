from typing import List

from fastapi import APIRouter, HTTPException

from dependencies.services.pair import get_pair_service
from domain.metaholder.responses.pair import PairResponse
from services.exceptions import NotFoundException

router = APIRouter(
    prefix='/pair',
    tags=['Pair'],
)


@router.get('')
async def get_pairs_list() -> List[PairResponse]:
    try:
        pair_service = get_pair_service()
        return await pair_service.get_pairs_list()
    except NotFoundException:
        raise HTTPException(
            status_code=404,
            detail=f"No one pair bro",
        )
