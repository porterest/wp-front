from infrastructure.db.repositories.AppWalletRepository import AppWalletRepository

from . import get_session_maker


def get_app_wallet_repository() -> AppWalletRepository:
    return AppWalletRepository(
        session_maker=get_session_maker()
    )
