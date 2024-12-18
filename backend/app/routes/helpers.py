from typing import Optional
from uuid import UUID

from fastapi import Request, Response

from domain.dto.auth import AuthTokens
from settings import settings


def get_user_id_from_request(request: Request) -> Optional[UUID]:
    return request.scope.get('x_user_id', None)


def set_tokens_cookies(response: Response, tokens: AuthTokens) -> Response:
    response.set_cookie(
        'access_token',
        tokens.access_token.get_secret_value(),
        secure=True,
        httponly=True,
        max_age=settings.jwt.access_expire + 10,
    )
    response.set_cookie(
        'refresh_token',
        tokens.refresh_token.get_secret_value(),
        secure=True,
        httponly=True,
        max_age=settings.jwt.refresh_expire + 10,
    )
    return response
