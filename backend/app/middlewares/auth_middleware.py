import logging
from uuid import UUID

from fastapi import Request
from fastapi.responses import JSONResponse

from dependencies.services.auth import get_auth_service
from services.exceptions import InvalidTokenException, ExpiredTokenException, NoSuchUserException


async def check_for_auth(
        request: Request,
        call_next,
):
    if (request.url.path.startswith("/auth")
            or request.url.path.startswith("/docs") or
            request.url.path.startswith("/openapi")) or request.method == 'OPTIONS':
        response = await call_next(request)
        return response

    access_token = request.headers.get('Authorization').replace('Bearer ', '')

    auth_service = get_auth_service()
    try:
        if access_token != 'abc':
            user_id = await auth_service.get_user_id_from_jwt(access_token)
        else:
            user_id = UUID('ff68456d-2b16-4fff-b1fb-041210ec6e9f')
    except Exception as e:
        logging.getLogger(__name__).error(f"fuuuck {access_token}", exc_info=True)
        code, detail = 401, 'Unknown authorization exception'
        match e:
            case InvalidTokenException():
                detail = 'Token is invalid'
            case ExpiredTokenException():
                detail = 'Token is expired'
            case NoSuchUserException():
                detail = 'User ID found in token does not exist'

        return JSONResponse(
            status_code=code,
            content={
                'detail': detail,
            }
        )

    print(request.scope.keys())
    request.scope['x_user_id'] = user_id
    print(request.scope.keys())
    response = await call_next(request)
    return response
