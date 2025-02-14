from abstractions.services.bet import BetServiceInterface
from dependencies.repositories.bet import get_bet_repository
from dependencies.repositories.block import get_block_repository
from dependencies.repositories.user import get_user_repository
from dependencies.services.chain import get_chain_service
from services.BetService import BetService


def get_bet_service() -> BetServiceInterface:
    return BetService(
        bet_repository=get_bet_repository(),
        user_repository=get_user_repository(),
        chain_service=get_chain_service(),
        block_repository=get_block_repository(),
    )
