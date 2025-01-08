from abstractions.repositories.deposit import DepositRepositoryInterface
from dependencies.repositories import get_session_maker
from infrastructure.db.repositories.DepositRepository import DepositRepository


def get_deposit_repository() -> DepositRepositoryInterface:
    return DepositRepository(
        session_maker=get_session_maker()
    )
