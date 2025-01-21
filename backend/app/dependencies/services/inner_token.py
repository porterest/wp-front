from abstractions.services.inner_token import InnerTokenInterface
from dependencies.services.ton.client import get_ton_client
from services.InnerToken import InnerTokenService


def get_inner_token_service() -> InnerTokenInterface:
    return InnerTokenService(
        ton_client=get_ton_client()
    )