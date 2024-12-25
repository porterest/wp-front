from abstractions.repositories.block import BlockRepositoryInterface
from abstractions.services.block import BlockServiceInterface
from dependencies.repositories.block import get_block_repository
from dependencies.services.bet import get_bet_service
from services.BlockService import BlockService


def get_block_service() -> BlockServiceInterface:
    return BlockService(
        block_repository=get_block_repository(),
        bet_service=get_bet_service()
    )