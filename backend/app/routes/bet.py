from fastapi import APIRouter, Request, HTTPException

from dependencies.services.bet import get_bet_service
from dependencies.services.chain import get_chain_service
from domain.dto.bet import CreateBetDTO
from domain.enums import BetStatus
from domain.metaholder.requests.bet import PlaceBetRequest, CancelBetRequest
from routes.helpers import get_user_id_from_request
from services.exceptions import NotEnoughMoney

router = APIRouter(
    prefix="/bets",
    tags=["bets/"],
)


@router.post('/bet')
async def place_bet(bet: PlaceBetRequest, request: Request) -> None:
    try:
        service = get_bet_service()
        user_id = get_user_id_from_request(request)
        return await service.create_bet(bet, user_id)  # NEWBET
    except NotEnoughMoney:
        raise HTTPException(
            status_code=503,
            detail=f"No money bro",
        )


@router.post('/cancel')
async def cancel_bet(bet: CancelBetRequest) -> None:
    service = get_bet_service()
    # bet = await service.get(bet.bet_id)
    await service.cancel_bet(bet.bet_id)
