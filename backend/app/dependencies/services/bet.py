from abstractions.services.bet import BetServiceInterface
from dependencies.repositories.bet import get_bet_repository
from dependencies.services.user import get_user_service
from services.BetService import BetService


def get_bet_service() -> BetServiceInterface:
    return BetService(
        bet_repository=get_bet_repository(),
        user_service=get_user_service()
    )