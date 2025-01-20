from abstractions.services.user import UserServiceInterface
from dependencies.repositories.deposit import get_deposit_repository
from dependencies.repositories.user import get_user_repository
from dependencies.services.block import get_block_service
from dependencies.services.currency import get_currency_service
from dependencies.services.swap import get_swap_service
from services.user import UserService


def get_user_service() -> UserServiceInterface:
    return UserService(
        user_repository=get_user_repository(),
        block_service=get_block_service(),
        deposit_repository=get_deposit_repository(),
        swap_service=get_swap_service(),
        currency_service=get_currency_service()
    )
