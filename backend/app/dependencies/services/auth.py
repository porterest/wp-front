from abstractions.services.auth import AuthServiceInterface
from abstractions.services.auth.tokens import TokenServiceInterface
from abstractions.services.auth.tonproof import TonProofServiceInterface
from dependencies.services.ton.client import get_ton_client
from dependencies.services.ton.known_wallets import get_known_wallets_provider
from dependencies.services.ton.public_keys import get_public_key_provider
from dependencies.services.user import get_user_service
from services.TelegramWalletAuthService import TelegramWalletAuthService
from services.TokenService import TokenService
from services.ton.tonconnect.TonProofService import TonProofService
from settings import settings


def get_auth_service() -> AuthServiceInterface:
    return TelegramWalletAuthService(
        user_service=get_user_service(),
        token_service=get_token_service(),
    )


def get_token_service() -> TokenServiceInterface:
    return TokenService(
        jwt_settings=settings.jwt,
    )


def get_tonproof_service() -> TonProofServiceInterface:
    return TonProofService(
        # services
        tokens_service=get_token_service(),
        ton_client=get_ton_client(),
        public_key_provider=get_public_key_provider(),
        known_wallets_provider=get_known_wallets_provider(),

        # settings
        payload_ttl=settings.tonconnect.payload_ttl,
        allowed_domains=settings.tonconnect.allowed_domains,
    )
