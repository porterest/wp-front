from abstractions.services.deposit import DepositServiceInterface
from services.DepositService import DepositService


def get_deposit_service() -> DepositServiceInterface:
    return DepositService(

    )
