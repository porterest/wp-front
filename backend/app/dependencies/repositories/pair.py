from infrastructure.db.repositories.PairRepository import PairRepository

from . import get_session_maker


def get_pair_repository() -> PairRepository:
    return PairRepository(
        session_maker=get_session_maker()
    )
