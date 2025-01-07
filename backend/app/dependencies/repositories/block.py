from abstractions.repositories.block import BlockRepositoryInterface
from infrastructure.db.repositories.BlockRepository import BlockRepository
from . import get_session_maker


def get_block_repository() -> BlockRepositoryInterface:
    return BlockRepository(
        session_maker=get_session_maker()
    )