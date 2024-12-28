from abstractions.services.auth.tokens import TokenServiceInterface
from services.TokenService import TokenService
from settings import settings


def get_token_service() -> TokenServiceInterface:
    return TokenService(
        jwt_settings=settings.jwt,
    )
