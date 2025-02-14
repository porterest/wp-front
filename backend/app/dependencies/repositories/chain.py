from abstractions.repositories.chain import ChainRepositoryInterface
from infrastructure.db.repositories.ChainRepository import ChainRepository

from . import get_session_maker


def get_chain_repository() -> ChainRepositoryInterface:
    return ChainRepository(
        session_maker=get_session_maker()
    )
