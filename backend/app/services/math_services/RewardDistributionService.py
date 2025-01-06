from dataclasses import dataclass

from abstractions.repositories.block import BlockRepositoryInterface
from abstractions.repositories.swap import SwapRepositoryInterface
from abstractions.services.app_wallet import AppWalletProviderInterface
from abstractions.services.dex import DexServiceInterface
from abstractions.services.math.reward_distribution import RewardDistributionServiceInterface
from domain.models.prediction import Prediction
from domain.models.reward_model import Rewards
from domain.models.user_prediction import UserPrediction
from domain.models.user_reward import UserReward


@dataclass
class RewardDistributionService(RewardDistributionServiceInterface):
    swap_repository: SwapRepositoryInterface
    block_repository: BlockRepositoryInterface
    dex_service: DexServiceInterface
    app_wallets: AppWalletProviderInterface

    FIXED_REWARD: int = 1  # guaranteed reward for participating in the round
    reward_multiplier: float = .0

    def determine_reward_multiplier(self, current_liquidity: float, swap_volume: float, system_reserve: float) -> float:
        """
        Рассчитывает reward_multiplier на основе текущего состояния системы.
        :param current_liquidity: Текущая ликвидность пула.
        :param swap_volume: Объем свапов за определенный период.
        :param system_reserve: Общий резерв системы (доступные средства).
        :return: Динамический коэффициент наград.
        """
        base_multiplier = 1.4  # Базовое значение

        # Учет резервов системы
        if system_reserve < 10000:
            return base_multiplier * 0.6  # Снижаем награды при низких резервах

        # Учет высокого объема свапов
        if swap_volume > 10000:
            return base_multiplier * 0.8  # Снижаем награды, чтобы компенсировать затраты

        # Учет высокого уровня ликвидности и достаточных резервов
        if current_liquidity > 50000 and system_reserve > 50000:
            return base_multiplier * 1.2  # Повышаем награды для стимулирования активности

        # Базовое значение
        return base_multiplier

    def determine_reward_pool(self, total_stake: float) -> float:
        ...

    def calculate_accuracy_coefficient(self, predicted: float, actual: float) -> float:
        """
        Рассчитывает коэффициент точности предсказания.
        :param predicted: Предсказанное значение.
        :param actual: Фактическое значение.
        :return: Коэффициент точности (от 0 до 1).
        """
        if actual == 0:
            return 0
        return max(.0, 1 - abs(predicted - actual) / abs(actual))

    async def calculate_rewards(self, prediction: Prediction) -> Rewards:
        """
        Рассчитывает награды пользователей.
        :param prediction: DTO с предсказаниями пользователей и фактическими данными.
        :return: Словарь с наградами для каждого пользователя.
        """

        total_accuracy = 0
        user_accuracies = {}
        total_stake = sum(user_prediction.stake for user_prediction in prediction.user_predictions)

        block = await self.block_repository.get(obj_id=prediction.block_id)
        pair = await self.block_repository.get_block_pair(block_id=prediction.block_id)

        # Получаем текущие показатели системы
        current_liquidity = await self.dex_service.get_current_liquidity(pair_id=pair.id)
        swaps = await self.swap_repository.get_last_swaps_for_chain(chain_id=block.chain_id)
        system_reserve = await self.app_wallets.get_available_inner_token_amount()

        swaps_volume = sum(map(lambda swap: swap.amount, swaps))

        # Рассчитываем динамический multiplier
        self.reward_multiplier = self.determine_reward_multiplier(
            current_liquidity=current_liquidity,
            swap_volume=swaps_volume,
            system_reserve=system_reserve,
        )

        # Рассчитываем точность для каждого пользователя
        for user_prediction in prediction.user_predictions:
            price_accuracy = self.calculate_accuracy_coefficient(
                user_prediction.predicted_price_change, prediction.actual_price_change
            )
            tx_accuracy = self.calculate_accuracy_coefficient(
                user_prediction.predicted_tx_count, prediction.actual_tx_count
            )
            accuracy = (price_accuracy + tx_accuracy) / 2
            user_accuracies[user_prediction.user_id] = accuracy
            total_accuracy += accuracy * user_prediction.stake

        if total_accuracy == 0:
            raise ValueError("Нет достаточной точности для распределения наград.")

        # Расчет наград
        rewards = []
        reward_pool = total_stake * self.reward_multiplier
        for user_prediction in prediction.user_predictions:
            user_id = user_prediction.user_id
            user_reward_share = user_accuracies[user_id] * user_prediction.stake
            user_reward = reward_pool * (user_reward_share / total_accuracy) + self.FIXED_REWARD
            rewards.append(
                UserReward(
                    user_id=user_id,
                    reward=user_reward,
                    accuracy=user_reward_share,
                )
            )

        return Rewards(total_reward_pool=reward_pool, user_rewards=rewards)


# Пример использования
if __name__ == "__main__":
    prediction = Prediction(
        user_predictions=[
            UserPrediction(
                user_id='user_1',
                stake=100,
                predicted_price_change=95,
                predicted_tx_count=55
            ),
            UserPrediction(
                user_id='user_2',
                stake=200,
                predicted_price_change=110,
                predicted_tx_count=60
            ),
            UserPrediction(
                user_id='user_3',
                stake=300,
                predicted_price_change=80,
                predicted_tx_count=30
            ),
        ],
        actual_price_change=100,
        actual_tx_count=50,
        block_id=None,
    )

    service = RewardDistributionService(

    )
    result = service.calculate_rewards(prediction)
    for user_id, reward in result["rewards"].items():
        print(f"Пользователь {user_id} получает награду: {reward:.2f}")
