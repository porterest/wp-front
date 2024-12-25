from fastapi import APIRouter

from dependencies.services.bet import get_bet_service
from domain.metaholder.requests.bet import PlaceBetRequest, CancelBetRequest

router = APIRouter(
    prefix="/bets",
    tags=["bets/"],
)


@router.post('/bet')
async def place_bet(bet: PlaceBetRequest) -> None:
    service = get_bet_service()
    return await service.create_bet(bet)


@router.post('/bet/cancel')
async def cancel_bet(bet: CancelBetRequest) -> None:
    service = get_bet_service()
    return await service.cancel_bet(bet)
