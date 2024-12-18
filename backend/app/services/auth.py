from abstractions.services.auth import AuthServiceInterface
from domain.dto.auth import Credentials, AuthTokens


class AuthService(AuthServiceInterface):
    async def check_tokens(self, tokens: AuthTokens) -> bool:
        pass

    async def create_token(self, credentials: Credentials) -> AuthTokens:
        pass