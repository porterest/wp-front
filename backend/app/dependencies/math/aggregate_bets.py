from abstractions.services.math.aggregate_bets import AggregateBetsServiceInterface
from dependencies.repositories.block import get_block_repository
from services.math_services.AggregateBetsService import AggregateBetsService


def get_aggregate_bets_service() -> AggregateBetsServiceInterface:
    return AggregateBetsService(
        block_repository=get_block_repository(),
    )
