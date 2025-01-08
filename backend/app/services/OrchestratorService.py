import logging
from dataclasses import dataclass
from uuid import UUID

from abstractions.repositories.block import BlockRepositoryInterface
from abstractions.repositories.chain import ChainRepositoryInterface
from abstractions.services.app_wallet import AppWalletServiceInterface
from abstractions.services.assets_management import AssetsManagementServiceInterface
from abstractions.services.dex import DexServiceInterface
from abstractions.services.liquidity_management import LiquidityManagerInterface
from abstractions.services.math.aggregate_bets import AggregateBetsServiceInterface
from abstractions.services.math.reward_distribution import RewardDistributionServiceInterface
from abstractions.services.orchestrator import OrchestratorServiceInterface
from abstractions.services.swap import SwapServiceInterface
from abstractions.services.user import UserServiceInterface
from domain.models.orchestrator_result import OrchestratorResult
from domain.models.prediction import Prediction
from domain.models.user_prediction import UserPrediction
from services.exceptions import StopPairProcessingException
from services.math_services.exceptions import TooLittleLiquidityException

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
    block_repository: BlockRepositoryInterface
    app_wallet_service: AppWalletServiceInterface
    chain_repository: ChainRepositoryInterface

    inner_token_symbol: str

    async def process_block(self, block_id: UUID) -> OrchestratorResult:
        """
        Основной метод, управляющий всем процессом на уровне блока.
        :param block_id: ID текущего блока.
        """
        # Stage 1: calculations
        block = await self.block_repository.get(block_id)
        chain = await self.chain_repository.get(block.chain_id)
        # 1. Получение агрегированной ставки
        aggregated_bets = await self.aggregate_bets_service.aggregate_bets(block.id)
        logger.info(f"Aggregated bets: {aggregated_bets}")

        # 2. Получение текущего состояния пула
        current_pool_state = await self.dex_service.get_pool_state()
        logger.info(f"Current pool state: {current_pool_state}")

        # 3. Расчет целевого состояния пула
        calculated_swap = await self.swap_service.calculate_swap(
            current_price=current_pool_state.price,
            current_state=current_pool_state.balances,
            target_price_change=aggregated_bets[0],
        )

        # 8. Распределение наград
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
            actual_price_change=block.result_vector[0],
            actual_tx_count=block.result_vector[1],
            block_id=block.id,
        )
        rewards = await self.reward_service.calculate_rewards(prediction_dto)
        logger.info(f"Rewards: {rewards}")

        other_token_symbol = (set(current_pool_state.balances.keys()) - {self.inner_token_symbol}).pop()

        available_inner_tokens = await self.app_wallet_service.get_inner_tokens_amount()
        available_other_tokens = await self.app_wallet_service.get_token_amount(other_token_symbol)

        # Общие затраты
        inner_token_needed = (
                rewards.total_reward_pool +
                (calculated_swap.volume if self.inner_token_symbol == calculated_swap.target_token else 0)
        )

        other_token_needed = calculated_swap.volume if self.inner_token_symbol != calculated_swap.target_token else 0  # noqa

        # Рассчитываем дефицит токенов
        inner_token_state = available_inner_tokens - inner_token_needed
        other_token_state = available_other_tokens - other_token_needed

        # 5. Управление ликвидностью
        users_activity = await self.user_service.get_users_activity(block_id=block.id)
        swap_score = await self.swap_service.get_swap_score(pair_id=chain.pair_id)
        pool_activity = await self.dex_service.get_pool_activity(pair_id=chain.pair_id)
        try:
            liquidity_action = self.liquidity_manager.decide_liquidity_action(
                inner_token_state=inner_token_state,
                other_token_state=other_token_state,
                pool_trade_intensity=pool_activity,
                pool_state=current_pool_state,
                swaps_volume_score=swap_score,
                calculated_swap=calculated_swap,
                bets_count=users_activity.count,
                bets_volume=users_activity.volume,
            )
        except TooLittleLiquidityException:
            logger.error(f'Cant perform anything - ran out of money!')
            raise StopPairProcessingException

        # # Логирование результатов
        logger.info(f"Required rewards: {rewards.total_reward_pool}")
        logger.info(f"Need to get from swap: {calculated_swap.volume}{calculated_swap.target_token}")
        logger.info(f"Liquidity action: {liquidity_action}")

        total_inner_token = inner_token_state + liquidity_action.states[self.inner_token_symbol].delta

        # Stage 2: actions
        if total_inner_token < 0:
            await self.assets_management_service.mint_inner_token(total_inner_token)
            logger.info(f"Minted {total_inner_token}{self.inner_token_symbol}")

        # 6. Выполнение свапа, если требуется
        swap_result = await self.swap_service.bet_swap(
            calculated_swap=calculated_swap,
            pair_id=chain.pair_id,
        )
        logger.info(f"Swap performed")

        # 7. Добавление/удаление ликвидности
        await self.dex_service.perform_liquidity_action(liquidity_action=liquidity_action)
        logger.info(f"Liquidity managed result")

        # 9. Распределение наград
        await self.user_service.distribute_rewards(rewards)

        return OrchestratorResult(
            liquidity_action=liquidity_action,
            swap_result=swap_result,
            swap=calculated_swap,
            rewards=rewards,
        )  # todo: do we really need this?

#
# import asyncio
# from uuid import uuid4
#
# # Mock реализации интерфейсов для тестирования
# class MockDexService(DexServiceInterface):
#     async def get_pool_state(self):
#         return {"token_x": 850, "token_y": 1900}
#
#     async def get_pool_activity(self):
#         return {"trades": 100, "volume": 5000}
#
#     async def get_users_activity(self):
#         return {"bets_count": 20, "users_volume": 1500}
#
#     async def get_swap_volumes(self):
#         return {"swaps": 25, "swap_volume": 2000}
#
# class MockRewardService(RewardServiceInterface):
#     async def calculate_total_rewards(self, block_id):
#         return 1000
#
#     async def calculate_user_rewards(self, block_id):
#         return {"user_1": 300, "user_2": 400, "user_3": 300}
#
#     async def distribute_rewards(self, rewards):
#         return {"message": f"Distributed rewards: {rewards}"}
#
# class MockAggregateBetsService(AggregateBetsServiceInterface):
#     async def aggregate_bets(self, block_id):
#         return 1000, 2000
#
# # Тестирование OrchestratorService
# async def main():
#     orchestrator = OrchestratorService(
#         aggregate_bets_service=MockAggregateBetsService(),
#         liquidity_management_service=LiquidityManagementService(MockDexService()),
#         assets_management_service=AssetsManagementService(MockDexService(), MockRewardService()),
#         dex_service=MockDexService(),
#         reward_service=MockRewardService()
#     )
#
#     result = await orchestrator.process_block(uuid4())
#     logger.info(result)
#
# # Запуск
# asyncio.run(main())
