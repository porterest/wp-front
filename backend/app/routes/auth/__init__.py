import logging

from fastapi import APIRouter, Cookie, HTTPException, Response

from dependencies.services.auth import get_auth_service
from routes.helpers import set_tokens_cookies
from services.exceptions import ExpiredTokenException, NoSuchUserException, InvalidTokenException

router = APIRouter(
    prefix='/auth',
    tags=['Authorization'],
)

logger = logging.getLogger(__name__)


@router.post('/refresh')
async def refresh_tokens(
        response: Response,
        refresh_token: str = Cookie(),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail='No refresh token provided')

    auth_service = get_auth_service()

    try:
        new_tokens = await auth_service.refresh_token(refresh_token)
        response = set_tokens_cookies(response=response, tokens=new_tokens)  # noqa
        return
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
