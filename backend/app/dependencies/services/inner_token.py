from abstractions.services.inner_token import InnerTokenInterface
from dependencies.repositories.user import get_user_repository
from dependencies.services.app_wallet.service import get_app_wallet_service
from dependencies.services.ton.client import get_ton_client
from services.InnerToken import InnerTokenService


def get_inner_token_service() -> InnerTokenInterface:
    return InnerTokenService(
        ton_client=get_ton_client(),
        user_repository=get_user_repository(),
        app_wallet_provider=get_app_wallet_service()
    )
