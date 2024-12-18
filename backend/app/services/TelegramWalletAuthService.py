from dataclasses import dataclass
from uuid import UUID

from abstractions.services.auth import AuthServiceInterface
from abstractions.services.auth.tokens import TokenServiceInterface
from abstractions.services.user import UserServiceInterface
from domain.dto.auth import AuthTokens, Credentials
from services.exceptions import InvalidTokenException, NoSuchUserException, ExpiredTokenException, NotFoundException
from services.ton.tonconnect.exceptions import InvalidPayloadToken


@dataclass
class TelegramWalletAuthService(AuthServiceInterface):
    user_service: UserServiceInterface
    token_service: TokenServiceInterface

    async def get_user_id_from_jwt(self, token: str) -> UUID:
        try:
            payload = self.token_service.get_token_payload(token=token)
            address: str | None = payload.get('wallet', None)
            if not address:
                raise InvalidTokenException()

            # raises NoSuchUserException if no user with this address
            user = await self.user_service.get_user_by_wallet(address)

            return user.id
        except (InvalidTokenException, NoSuchUserException, ExpiredTokenException):
            raise

    async def create_token(self, credentials: Credentials) -> AuthTokens:
        payload_is_valid = self.token_service.validate_token(token=credentials.payload)
        if not payload_is_valid:
            raise InvalidPayloadToken

        tokens = self.token_service.create_auth_token(
            wallet_address=credentials.wallet_address,
            payload=credentials.payload,
        )

        return tokens

    async def refresh_token(self, refresh_token: str) -> AuthTokens:
        try:
            old_claims = self.token_service.get_token_payload(refresh_token)
            wallet_address, payload = old_claims['sub'], old_claims['payload']
            await self.user_service.get_user_by_wallet(wallet_address)

            return self.token_service.create_auth_token(wallet_address=wallet_address, payload=payload)
        except (InvalidTokenException, NoSuchUserException, ExpiredTokenException):
            raise
