from dataclasses import dataclass
from math import sqrt
from uuid import UUID

from abstractions.repositories.chain import ChainRepositoryInterface
from abstractions.repositories.swap import SwapRepositoryInterface
from abstractions.services.app_wallet import AppWalletProviderInterface
from abstractions.services.assets_management import AssetsManagementServiceInterface
from abstractions.services.block import BlockServiceInterface
from abstractions.services.dex import DexServiceInterface
from abstractions.services.liquidity_management import LiquidityManagementServiceInterface
from abstractions.services.math.aggregate_bets import AggregateBetsServiceInterface
from abstractions.services.math.reward_distribution import RewardDistributionServiceInterface
from abstractions.services.swap import SwapServiceInterface
from abstractions.services.user import UserServiceInterface
from domain.enums.liquidity_action import LiquidityActionType
from domain.models.liquidity_action import LiquidityAction
from domain.models.orchestrator_result import OrchestratorResult
from domain.models.prediction import Prediction
from domain.models.user_prediction import UserPrediction


@dataclass
class OrchestratorService:
    aggregate_bets_service: AggregateBetsServiceInterface
    liquidity_management_service: LiquidityManagementServiceInterface
    assets_management_service: AssetsManagementServiceInterface
    dex_service: DexServiceInterface
    reward_service: RewardDistributionServiceInterface
    user_service: UserServiceInterface
    swap_service: SwapServiceInterface
    block_service: BlockServiceInterface
    app_wallet_provider: AppWalletProviderInterface
    chain_repository: ChainRepositoryInterface

    async def process_block(self, block_id: UUID):
        """
        Основной метод, управляющий всем процессом на уровне блока.
        :param block_id: ID текущего блока.
        """

        # Stage 1: calculations

        block = await self.block_service.get_block(block_id)
        chain = await self.chain_repository.get(block.chain_id)
        # 1. Получение агрегированной ставки
        aggregated_bets = await self.aggregate_bets_service.aggregate_bets(block_id)
        print(f"Aggregated bets: {aggregated_bets}")

        # 2. Получение текущего состояния пула
        current_pool_state = await self.dex_service.get_pool_state()
        print(f"Current pool state: {current_pool_state}")

        # 3. Расчет целевого состояния пула
        calculated_swap = await self.swap_service.calculate_swap(
            current_price=current_pool_state.price,
            current_state=current_pool_state.balances,
            target_price_change=aggregated_bets[0],
        )

        target_x = sqrt(current_pool_state["token_x"] * current_pool_state["token_y"] / aggregated_bets[0])
        target_y = current_pool_state["token_x"] * current_pool_state["token_y"] / target_x
        target_pool_state = {
            "token_x": target_x,
            "token_y": target_y
        }
        print(f"Target pool state: {target_pool_state}")

        # 4. Вычисление дельты между текущим и целевым состоянием
        pool_state_delta = {
            "token_x": target_pool_state["token_x"] - current_pool_state["token_x"],
            "token_y": target_pool_state["token_y"] - current_pool_state["token_y"]
        }
        print(f"Pool state delta: {pool_state_delta}")

        # 5. Управление ликвидностью
        users_activity = await self.user_service.get_users_activity(block_id=block.id)
        swap_score = await self.swap_service.get_swap_score(pair_id=chain.pair_id)
        pool_activity = await self.dex_service.get_pool_activity(pair_id=chain.pair_id)


        liquidity_action = self.liquidity_management_service.decide_liquidity_action(
            inner_token_state=None,
            other_token_state=None,
            pool_trade_intensity=pool_activity,
            swaps_volume_score=swap_score,
            bets_count=users_activity.count,
            bets_volume=users_activity.volume,
        )
        print(f"Liquidity action: {liquidity_action}")

        # 8. Распределение наград
        user_predictions = [
            UserPrediction(
                user_id=bet.user_id,
                stake=bet.amount,
                predicted_price_change=bet.predicted_price_change,
                predicted_tx_count=bet.predicted_tx_count
            )
            for bet in block.bets
        ]

        prediction_dto = Prediction(
            user_predictions=user_predictions,
            actual_price_change=block.result_vector[0],
            actual_tx_count=block.result_vector[1],
            block_id=block.id,
        )
        rewards = self.reward_service.calculate_rewards(prediction_dto)
        print(f"Rewards: {rewards}")

        # Получаем доступное количество внутренних токенов
        current_tokens = await self.app_wallet_provider.get_available_inner_token_amount()

        # Сумма, необходимая для наград
        required_rewards = sum(rewards.values())

        # Оценка затрат на свап (например, по pool_state_delta)
        swap_cost = abs(pool_state_delta["token_x"])  # Считаем только токены X

        # Оценка затрат на ликвидность (например, на добавление ликвидности)
        if liquidity_action.action == LiquidityActionType.ADD:
            liquidity_cost = abs(self.liquidity_management_service.calculate_tokens_deficit_or_surplus()["token_x"])
        elif liquidity_action.action == LiquidityActionType.REMOVE:
            liquidity_cost = 0  # Убираем ликвидность, это не требует затрат
        else:
            liquidity_cost = 0  # Если действие HOLD, затраты отсутствуют

        # Общие затраты
        total_required_tokens = required_rewards + swap_cost + liquidity_cost

        # Рассчитываем дефицит токенов
        token_deficit = max(0, total_required_tokens - current_tokens)

        # Логирование результатов
        print(f"Required rewards: {required_rewards}")
        print(f"Swap cost: {swap_cost}")
        print(f"Liquidity cost: {liquidity_cost}")
        print(f"Total required tokens: {total_required_tokens}")
        print(f"Token deficit: {token_deficit}")

        # Stage 2: actions

        mint_result = await self.assets_management_service.mint_inner_token_if_needed(required_rewards)
        print(f"Mint result: {mint_result}")

        # 6. Выполнение свапа, если требуется
        swap_result = await self.dex_service.perform_swap(pool_state_delta)
        print(f"Swap result: {swap_result}")

        # 7. Добавление/удаление ликвидности
        liquidity_result = await self.dex_service.perform_liquidity_action(  # todo: implement
            liquidity_action,
            pool_state_delta,
        )
        print(f"Liquidity management result: {liquidity_result}")

        # 9. Распределение наград
        rewards = self.user_service.distribute_rewards(rewards)
        rewards_result = {user_id: details.to_dict() for user_id, details in rewards.items()}
        print(f"Rewards distributed: {rewards_result}")

        return OrchestratorResult(
            liquidity_result=liquidity_result,
            swap_result=swap_result,
            rewards_result=rewards_result,
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
#     print(result)
#
# # Запуск
# asyncio.run(main())
