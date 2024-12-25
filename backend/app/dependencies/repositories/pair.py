from abstractions.repositories.pair import PairRepositoryInterface
from infrastructure.db.repositories.PairRepository import PairRepository

from . import get_session_maker


def get_pair_repository() -> PairRepositoryInterface:
    return PairRepository(
        session_maker=get_session_maker()
    )
