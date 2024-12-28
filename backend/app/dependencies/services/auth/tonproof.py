from abstractions.services.auth.tonproof import TonProofServiceInterface
from dependencies.services.auth.tokens import get_token_service
from dependencies.services.ton.client import get_ton_client
from dependencies.services.ton.known_wallets import get_known_wallets_provider
from dependencies.services.ton.public_keys import get_public_key_provider
from services.ton.tonconnect.TonProofService import TonProofService
from settings import settings


def get_tonproof_service() -> TonProofServiceInterface:
    return TonProofService(
        # services
        tokens_service=get_token_service(),
        ton_client=get_ton_client(),
        public_key_provider=get_public_key_provider(),
        known_wallets_provider=get_known_wallets_provider(),

        # settings
        payload_ttl=settings.ton.tonconnect.payload_ttl,
        allowed_domains=settings.ton.tonconnect.allowed_domains,
    )
