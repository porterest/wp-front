from abstractions.services.deposit import DepositServiceInterface
from dependencies.repositories.deposit import get_deposit_repository
from dependencies.repositories.transaction import get_transaction_repository
from dependencies.services.app_wallet.service import get_app_wallet_service
from dependencies.services.ton.client import get_ton_client
from dependencies.services.user import get_user_service
from services.DepositService import DepositService


def get_deposit_service() -> DepositServiceInterface:
    return DepositService(
        deposit_repository=get_deposit_repository(),
        app_wallet_service=get_app_wallet_service(),
        transaction_repository=get_transaction_repository(),
        user_service=get_user_service(),
        ton_client=get_ton_client(),
    )
