from infrastructure.db.repositories.BalanceRepository import BalanceRepository

from . import get_session_maker


def get_balance_repository() -> BalanceRepository:
    return BalanceRepository(
        session_maker=get_session_maker()
    )
