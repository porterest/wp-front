from infrastructure.db.repositories.BetRepository import BetRepository
from . import get_session_maker


def get_bet_repository() -> BetRepository:
    return BetRepository(
        session_maker=get_session_maker()
    )
