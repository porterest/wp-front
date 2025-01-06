from abstractions.services.deposit import DepositServiceInterface
from dependencies import get_scheduler
from dependencies.repositories.deposit import get_deposit_repository
from dependencies.repositories.user import get_user_repository
from dependencies.services.app_wallet.provider import get_app_wallet_provider
from services.DepositService import DepositService


def get_deposit_service() -> DepositServiceInterface:
    return DepositService(
        deposit_repository=get_deposit_repository(),
        scheduler=get_scheduler(),
        user_repository=get_user_repository(),
        app_wallet_provider=get_app_wallet_provider(),
    )
