from abstractions.services.block import BlockServiceInterface
from dependencies.math.aggregate_bets import get_aggregate_bets_service
from dependencies.repositories.block import get_block_repository
from dependencies.repositories.chain import get_chain_repository
from dependencies.services.bet import get_bet_service
from services.BlockService import BlockService


def get_block_service() -> BlockServiceInterface:
    return BlockService(
        block_repository=get_block_repository(),
        bet_service=get_bet_service(),
        aggregate_bets_service=get_aggregate_bets_service(),
        chain_repository=get_chain_repository()
    )
