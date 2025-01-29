import logging
from dataclasses import dataclass
from uuid import UUID

from abstractions.repositories.block import BlockRepositoryInterface
from abstractions.services.math.aggregate_bets import AggregateBetsServiceInterface
from domain.models.bet import BetVector

logger = logging.getLogger(__name__)


@dataclass
class AggregateBetsService(AggregateBetsServiceInterface):
    block_repository: BlockRepositoryInterface

    async def aggregate_bets(
            self,
            block_id: UUID,
    ) -> BetVector:
        block = await self.block_repository.get(block_id)

        total_weight = 0
        aggregate_x: float = .0
        aggregate_y: int = 0

        for bet in block.bets:
            weight = bet.amount
            total_weight += weight
            aggregate_x += bet.vector[0] * weight
            aggregate_y += bet.vector[1] * weight
            logger.info("weight")
            logger.info(weight)
            logger.info("total_weight")
            logger.info(total_weight)
            logger.info("aggregate_x")
            logger.info(aggregate_x)
            logger.info("aggregate_y")
            logger.info(aggregate_y)

        if total_weight > 0:
            aggregate_x /= total_weight
            aggregate_y /= total_weight
            logger.info(aggregate_x)
            logger.info("aggregate_x")
            logger.info(aggregate_y)
            logger.info("aggregate_y")
        else:
            aggregate_x = 0
            aggregate_y = 0

        aggregated_quaternion = aggregate_x, aggregate_y

        logger.info("aggregated_quaternion")
        logger.info(aggregated_quaternion)

        return aggregated_quaternion
