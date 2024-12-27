from abstractions.services.chain import ChainServiceInterface
from dependencies import get_scheduler
from dependencies.repositories.chain import get_chain_repository
from dependencies.repositories.pair import get_pair_repository
from dependencies.services.bet import get_bet_service
from dependencies.services.block import get_block_service
from services.ChainService import ChainService


def get_chain_service() -> ChainServiceInterface:
    return ChainService(
        block_service=get_block_service(),
        bet_service=get_bet_service(),
        scheduler=get_scheduler(),
        chain_repository=get_chain_repository(),
        pair_repository=get_pair_repository()
    )
