from abstractions.services.chain import ChainServiceInterface
from dependencies import get_scheduler
from dependencies.services.bet import get_bet_service
from dependencies.services.block import get_block_service
from services.ChainService import ChainService


def get_chain_service() -> ChainServiceInterface:
    return ChainService(
        block_service=get_block_service(),
        bet_service=get_bet_service(),
        scheduler=get_scheduler()
    )
