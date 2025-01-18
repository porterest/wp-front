import logging
from dataclasses import dataclass
from uuid import UUID

from abstractions.repositories.chain import ChainRepositoryInterface
from abstractions.services.app_wallet import AppWalletServiceInterface
from abstractions.services.assets_management import AssetsManagementServiceInterface
from abstractions.services.block import BlockServiceInterface
from abstractions.services.dex import DexServiceInterface
from abstractions.services.liquidity_management import LiquidityManagerInterface
from abstractions.services.math.aggregate_bets import AggregateBetsServiceInterface
from abstractions.services.math.pool_service import PoolServiceInterface
from abstractions.services.math.reward_distribution import RewardDistributionServiceInterface
from abstractions.services.orchestrator import OrchestratorServiceInterface
from abstractions.services.swap import SwapServiceInterface
from abstractions.services.user import UserServiceInterface
from domain.enums.liquidity_action import LiquidityActionType
from domain.models.orchestrator_result import OrchestratorResult
from domain.models.prediction import Prediction
from domain.models.user_prediction import UserPrediction

logger = logging.getLogger(__name__)


@dataclass
class OrchestratorService(OrchestratorServiceInterface):
    aggregate_bets_service: AggregateBetsServiceInterface
    liquidity_manager: LiquidityManagerInterface
    assets_management_service: AssetsManagementServiceInterface
    dex_service: DexServiceInterface
    reward_service: RewardDistributionServiceInterface
    user_service: UserServiceInterface
    swap_service: SwapServiceInterface
    block_service: BlockServiceInterface
    app_wallet_service: AppWalletServiceInterface
    chain_repository: ChainRepositoryInterface
    pool_service: PoolServiceInterface
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

        pool_state = await self.pool_service.get_current_pool_state()
        liquidity_action = await self.liquidity_manager.decide_liquidity_action(current_pool_state=pool_state,
                                                                                predicted_price=aggregated_bets[0])

        # Stage 4: минт
        reward_mint = rewards.total_reward_pool

        # Получаем состояние внутреннего токена из liquidity_action
        inner_token_state = liquidity_action.states.get(self.inner_token_symbol)

        # Проверяем, нужно ли добавить токены
        if liquidity_action.action == LiquidityActionType.ADD and inner_token_state and inner_token_state.delta > 0:
            # Рассчитываем количество токенов для минтинга
            liquidity_mint = inner_token_state.delta
        else:
            liquidity_mint = 0

        total_mint = int(reward_mint + liquidity_mint)
        # Вызываем метод минтинга
        await self.dex_service.mint_token(
            amount=total_mint
        )

        return OrchestratorResult(
            liquidity_action=liquidity_action,
            mint=total_mint,
            rewards=rewards,
        )
