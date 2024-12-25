from infrastructure.db.repositories.BlockRepository import BlockRepository
from . import get_session_maker


def get_block_repository() -> BlockRepository:
    return BlockRepository(
        session_maker=get_session_maker()
    )