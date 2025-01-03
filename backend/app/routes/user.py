import logging

from fastapi import APIRouter, HTTPException
from starlette.requests import Request

from dependencies.services.user import get_user_service
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
            at_risk=sum([x.amount for x in user.bets]),
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
