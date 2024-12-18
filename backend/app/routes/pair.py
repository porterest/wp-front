from typing import List

from fastapi import APIRouter

from dependencies.repositories.pair import get_pair_repository
from domain.metaholder.responses.pair import PairResponse

router = APIRouter(
    prefix='/pair',
    tags=['Pair'],
)


@router.get('')
async def get_pairs_list() -> List[PairResponse]:
    pairs = get_pair_repository()
    return [PairResponse(name=x.name) for x in await pairs.get_all()]
