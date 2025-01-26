from fastapi import APIRouter, Request

from dependencies.services.bet import get_bet_service
from dependencies.services.chain import get_chain_service
from domain.dto.bet import CreateBetDTO
from domain.enums import BetStatus
from domain.metaholder.requests.bet import PlaceBetRequest, CancelBetRequest
from routes.helpers import get_user_id_from_request

router = APIRouter(
    prefix="/bets",
    tags=["bets/"],
)


@router.post('/bet')
async def place_bet(bet: PlaceBetRequest, request: Request) -> None:
    service = get_bet_service()
    user_id = get_user_id_from_request(request)
    chain_service = get_chain_service()
    chain = await chain_service.get_by_pair_id(bet.pair_id)
    block_state = await chain_service.get_current_block_state(chain.pair_id)
    dto = CreateBetDTO(
        user_id=user_id,
        pair_id=bet.pair_id,
        amount=bet.amount,
        block_id=block_state.block_id,
        vector=bet.predicted_vector,
        status=BetStatus.PENDING,
    )
    return await service.create_bet(dto)


@router.post('/cancel')
async def cancel_bet(bet: CancelBetRequest) -> None:
    service = get_bet_service()
    # bet = await service.get(bet.bet_id)
    await service.cancel_bet(bet.bet_id)
