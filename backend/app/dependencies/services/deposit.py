from abstractions.services.deposit import DepositServiceInterface
from dependencies.repositories.deposit import get_deposit_repository
from services.DepositService import DepositService


def get_deposit_service() -> DepositServiceInterface:
    return DepositService(
        deposit_repository=get_deposit_repository()
    )
