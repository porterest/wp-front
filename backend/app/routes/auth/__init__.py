import logging

from fastapi import APIRouter, HTTPException, Header

from dependencies.services.auth import get_auth_service
from domain.metaholder.responses.auth import AuthResponse
from services.exceptions import ExpiredTokenException, NoSuchUserException, InvalidTokenException
from .tonconnect import router as ton_router

router = APIRouter(
    prefix='/auth',
    tags=['Authorization'],
)
router.include_router(ton_router)

logger = logging.getLogger(__name__)


@router.post('/refresh')
async def refresh_tokens(
        refresh_token: str = Header(alias='X-Refresh-Token'),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail='No refresh token provided')

    auth_service = get_auth_service()

    try:
        new_tokens = await auth_service.refresh_token(refresh_token)
        return AuthResponse(
            access_token=new_tokens.access_token.get_secret_value(),
            refresh_token=new_tokens.refresh_token.get_secret_value(),
        )
    except (InvalidTokenException, NoSuchUserException, ExpiredTokenException) as e:
        code, detail = 401, 'Unknown authorization exception'
        match e:
            case InvalidTokenException():
                detail = 'Refresh token is invalid'
            case ExpiredTokenException():
                detail = 'Refresh token is expired'
            case NoSuchUserException():
                detail = 'User ID found by refresh token does not exist'

        logger.info(detail)
        raise HTTPException(status_code=code, detail=detail)
