from abstractions.repositories.bet import BetRepositoryInterface
from infrastructure.db.repositories.BetRepository import BetRepository
from . import get_session_maker


def get_bet_repository() -> BetRepositoryInterface:
    return BetRepository(
        session_maker=get_session_maker()
    )
