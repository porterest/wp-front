from infrastructure.db.repositories.TransactionRepository import TransactionRepository

from . import get_session_maker


def get_transaction_repository() -> TransactionRepository:
    return TransactionRepository(
        session_maker=get_session_maker()
    )
