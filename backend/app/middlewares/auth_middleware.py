from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import SecretStr
from starlette.datastructures import URL

from dependencies.services.auth import get_auth_service
from domain.dto.auth import AuthTokens
from services.exceptions import InvalidTokenException, ExpiredTokenException, NoSuchUserException


async def check_for_auth(
        request: Request,
        call_next,
):
    if request.url.path.startswith("/auth"):
        response = await call_next(request)
        return response

    tokens = AuthTokens(
        access_token=SecretStr(request.cookies.get("AccessToken", "")),
        refresh_token=SecretStr(request.cookies.get("RefreshToken", "")),
    )

    auth_service = get_auth_service()
    try:
        user_id = await auth_service.get_user_id_from_jwt(tokens.access_token.get_secret_value())
    except Exception as e:
        code, detail = 401, 'Unknown authorization exception'
        match e:
            case InvalidTokenException():
                detail = 'Token is invalid'
            case ExpiredTokenException():
                detail = 'Token is expired'
            case NoSuchUserException():
                detail = 'User ID found in token does not exist'

        raise HTTPException(status_code=code, detail=detail)

    print(request.scope.keys())
    request.scope['x_user_id'] = user_id
    print(request.scope.keys())
    response = await call_next(request)
    return response
