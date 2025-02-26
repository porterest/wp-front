import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from starlette.requests import Request

from dependencies.services.bet import get_bet_service
from dependencies.services.inner_token import get_inner_token_service
from dependencies.services.user import get_user_service
from domain.enums import BetStatus
from domain.metaholder.requests.pair import GetUserLastBetRequest
from domain.metaholder.requests.wallet import WithdrawToExternalWalletRequest
from domain.metaholder.responses import BetResponse
from domain.metaholder.responses.bet_result import BetResult
from domain.metaholder.responses.user import UserHistoryResponse, UserBetsResponse, UserInfoResponse
from routes.helpers import get_user_id_from_request
from services.exceptions import NotFoundException

router = APIRouter(
    prefix='/user',

)

logger = logging.getLogger(__name__)


@router.get('/info')
async def get_user_info(
        request: Request,
) -> UserInfoResponse:
    user_id = get_user_id_from_request(request)

    user_service = get_user_service()

    try:
        user = await user_service.get_user(user_id)
        return UserInfoResponse(
            user_id=user.id,
            balance=user.balance,
            at_risk=sum([x.amount for x in user.bets if x.status == BetStatus.PENDING]),
        )
    except NotFoundException:
        logger.error(f"No user with ID {user_id}", exc_info=True)
        raise HTTPException(
            status_code=404,
            detail=f"No user with ID {user_id}",
        )


@router.get('/bets')
async def get_user_bets(
        request: Request,
) -> UserBetsResponse:
    user_id = get_user_id_from_request(request)

    users = get_user_service()

    try:
        return await users.get_user_bets(user_id)
    except NotFoundException:
        logger.error(f"No user with ID {user_id}", exc_info=True)
        raise HTTPException(
            status_code=404,
            detail=f"No user with ID {user_id}",
        )


@router.post('/last_bet')
async def get_last_user_bet(
        request: Request,
        pair_id: GetUserLastBetRequest
) -> Optional[BetResponse]:
    user_id = get_user_id_from_request(request)

    bets = get_bet_service()

    try:
        user_bet = await bets.get_last_user_bet(user_id=user_id, pair_id=pair_id.pair_id)
        bet = BetResponse(
            id=user_bet.id,
            amount=user_bet.amount,
            vector=user_bet.vector,
            pair_name=user_bet.pair.name,
            status=user_bet.status.value,
            reward=user_bet.reward,
            accuracy=user_bet.accuracy,
            created_at=user_bet.created_at
        )
        return bet
    except NotFoundException:
        logger.error(f"No user with ID {user_id}", exc_info=True)
        raise HTTPException(
            status_code=404,
            detail=f"No user with ID {user_id}",
        )


@router.get('/result_bet')
async def get_user_bet_result(
        request: Request,
) -> Optional[BetResult]:
    user_id = get_user_id_from_request(request)

    bets = get_bet_service()

    try:
        user_bet = await bets.get_last_user_completed_bet(user_id=user_id)
        bet = BetResult(
            id=user_bet.id,
            amount=user_bet.amount,
            pair_name=user_bet.pair.name,
            status=user_bet.status.value,
            reward=user_bet.reward,
            accuracy=user_bet.accuracy,
            created_at=user_bet.created_at,

        )
        return bet
    except NotFoundException:
        logger.error(f"No bet with user_id {user_id}", exc_info=True)
        raise HTTPException(
            status_code=404,
            detail=f"No bet with user_id {user_id}",
        )


@router.get('/history')
async def get_user_history(
        request: Request,
) -> UserHistoryResponse:
    user_id = get_user_id_from_request(request)

    users = get_user_service()

    try:
        return await users.get_user_history(user_id)
    except NotFoundException:
        logger.error(f"No user with ID {user_id}", exc_info=True)
        raise HTTPException(
            status_code=404,
            detail=f"No user with ID {user_id}",
        )


@router.post('/withdraw')  # disabled
async def withdraw_tokens(
        request: Request,
        withdraw_request: WithdrawToExternalWalletRequest
):
    user_id = get_user_id_from_request(request)
    inner_token_service = get_inner_token_service()
    await inner_token_service.withdraw_to_user(user_id=user_id, amount=withdraw_request.amount)
