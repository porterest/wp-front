from abstractions.services.auth import AuthServiceInterface
from dependencies.services.auth.tokens import get_token_service
from dependencies.services.user import get_user_service
from services.TelegramWalletAuthService import TelegramWalletAuthService


def get_auth_service() -> AuthServiceInterface:
    return TelegramWalletAuthService(
        user_service=get_user_service(),
        token_service=get_token_service(),
    )
