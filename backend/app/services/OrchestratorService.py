import logging
from dataclasses import dataclass
from uuid import UUID

from abstractions.repositories.block import BlockRepositoryInterface
from abstractions.repositories.chain import ChainRepositoryInterface
from abstractions.services.app_wallet import AppWalletServiceInterface
from abstractions.services.block import BlockServiceInterface
from abstractions.services.inner_token import InnerTokenInterface
from abstractions.services.liquidity_management import LiquidityManagerInterface
from abstractions.services.math.aggregate_bets import AggregateBetsServiceInterface
from abstractions.services.math.pool_service import PoolServiceInterface
from abstractions.services.math.reward_distribution import RewardDistributionServiceInterface
from abstractions.services.orchestrator import OrchestratorServiceInterface
from abstractions.services.user import UserServiceInterface
from domain.models.orchestrator_result import OrchestratorResult
from domain.models.prediction import Prediction
from domain.models.user_prediction import UserPrediction

logger = logging.getLogger(__name__)


@dataclass
class OrchestratorService(OrchestratorServiceInterface):
    aggregate_bets_service: AggregateBetsServiceInterface
    liquidity_manager: LiquidityManagerInterface
    reward_service: RewardDistributionServiceInterface
    user_service: UserServiceInterface
    block_service: BlockServiceInterface
    app_wallet_service: AppWalletServiceInterface
    chain_repository: ChainRepositoryInterface
    pool_service: PoolServiceInterface
    inner_token_service: InnerTokenInterface
    block_repository: BlockRepositoryInterface
    inner_token_symbol: str

    async def process_block(self, block_id: UUID) -> OrchestratorResult:
        """
        Основной метод, управляющий всем процессом на уровне блока.
        :param block_id: ID текущего блока.
        """
        block = await self.block_service.get_block(block_id)
        # 1. Получение агрегированной ставки
        aggregated_bets = await self.aggregate_bets_service.aggregate_bets(block.id)
        logger.info(f"Aggregated bets: {aggregated_bets}")
        if not aggregated_bets:
            block = await self.block_repository.get(block_id)
            chain = await self.chain_repository.get(block.chain_id)

            block = await self.block_service.get_last_completed_block_by_pair_id(chain.pair_id)
        # 2. Предсказания юзеров
        user_predictions = [
            UserPrediction(
                user_id=bet.user_id,
                stake=bet.amount,
                predicted_price_change=bet.vector[0],
                predicted_tx_count=bet.vector[1],
            )
            for bet in block.bets
        ]

        prediction_dto = Prediction(
            user_predictions=user_predictions,
            actual_price_change=aggregated_bets[0],
            actual_tx_count=aggregated_bets[1],
            block_id=block.id,
        )

        # 3. Распределение наград
        rewards = await self.reward_service.calculate_rewards(prediction_dto)
        logger.info(f"Rewards: {rewards}")

        # Stage 4: минт
        reward_mint = rewards.total_reward_pool

        # Вызываем метод минтинга
        if reward_mint > 0:
            try:
                await self.inner_token_service.mint(amount=reward_mint)
            except Exception as e:
                logger.error(f"not minted {reward_mint}", exc_info=True)

        return OrchestratorResult(
            mint=int(reward_mint),
            rewards=rewards,
        )
