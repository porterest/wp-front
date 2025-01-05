from abstractions.services.math.aggregate_bets import AggregateBetsServiceInterface
from dependencies.services.block import get_block_service
from services.math_services.AggregateBetsService import AggregateBetsService


def get_aggregate_bets_service() -> AggregateBetsServiceInterface:
    return AggregateBetsService(
        block_service=get_block_service(),
    )
