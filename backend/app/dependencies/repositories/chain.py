from infrastructure.db.repositories.UserRepository import UserRepository

from . import get_session_maker


def get_chain_repository() -> ChainRepository:
    return ChainRepository(
        session_maker=get_session_maker()
    )
