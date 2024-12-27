from abstractions.services.pair import PairServiceInterface
from dependencies.repositories.pair import get_pair_repository
from services.PairService import PairService


def get_pair_service() -> PairServiceInterface:
    return PairService(pair_repository=get_pair_repository())
