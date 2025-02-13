from dataclasses import dataclass
from uuid import UUID

from abstractions.repositories.bet import BetRepositoryInterface
from abstractions.services.math.reward_distribution import RewardDistributionServiceInterface
from domain.dto.bet import UpdateBetDTO
from domain.models.prediction import Prediction
from domain.models.reward_model import Rewards
from domain.models.user_reward import UserReward


@dataclass
class RewardDistributionService(RewardDistributionServiceInterface):
    bet_repository: BetRepositoryInterface
    FIXED_REWARD: int = 1
    base_multiplier: float = 1.3

    def _calculate_accuracy_coefficient(self, predicted: float, actual: float) -> float:
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

        for user_prediction in prediction.user_predictions:
            price_accuracy = self._calculate_accuracy_coefficient(
                user_prediction.predicted_price_change, prediction.actual_price_change
            )
            tx_accuracy = self._calculate_accuracy_coefficient(
                user_prediction.predicted_tx_count, prediction.actual_tx_count
            )
            accuracy = (price_accuracy + tx_accuracy) / 2
            user_accuracies[user_prediction.user_id] = accuracy
            total_accuracy += accuracy * user_prediction.stake

        if total_accuracy == 0:
            return Rewards(
                total_reward_pool=0,
                user_rewards=[],
            )

        rewards = []
        for user_prediction in prediction.user_predictions:
            user_id = user_prediction.user_id
            user_reward_share = user_accuracies[user_id] * user_prediction.stake
            user_reward = user_reward_share * self.base_multiplier  # + self.FIXED_REWARD
            rewards.append(
                UserReward(
                    user_id=user_id,
                    reward=user_reward,
                    accuracy=user_accuracies[user_id],
                )
            )
        await self.update_rewards(rewards)

        return Rewards(total_reward_pool=sum(r.reward for r in rewards), user_rewards=rewards)

    async def update_rewards(self, rewards: list[UserReward]):
        for reward in rewards:
            bet = await self.bet_repository.get_last_user_completed_bet(reward.user_id)
            update_bet = UpdateBetDTO(
                reward=reward.reward,
                accuracy=reward.accuracy
            )
            await self.bet_repository.update(obj_id=bet.id, obj=update_bet)

