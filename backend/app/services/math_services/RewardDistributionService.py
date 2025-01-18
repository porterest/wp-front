import asyncio
from dataclasses import dataclass
from uuid import UUID

from abstractions.services.math.reward_distribution import RewardDistributionServiceInterface
from domain.models.prediction import Prediction
from domain.models.reward_model import Rewards
from domain.models.user_prediction import UserPrediction
from domain.models.user_reward import UserReward


@dataclass
class RewardDistributionService(RewardDistributionServiceInterface):
    FIXED_REWARD: int = 1  # гарантированная награда за участие в раунде
    base_multiplier: float = 1.3

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
            return Rewards(
                total_reward_pool=0,
                user_rewards=[],
            )

        # Расчет наград
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

        return Rewards(total_reward_pool=sum(r.reward for r in rewards), user_rewards=rewards)


if __name__ == "__main__":
    async def main():
        # Пример данных для расчёта
        prediction = Prediction(
            user_predictions=[
                UserPrediction(
                    user_id=UUID('d992c181-a2e2-4439-b075-7e799cd7052f'),
                    stake=5,
                    predicted_price_change=95,
                    predicted_tx_count=55
                ),
                UserPrediction(
                    user_id=UUID('d036d331-c4fc-4e65-9398-05dd5b89aa92'),
                    stake=10,
                    predicted_price_change=110,
                    predicted_tx_count=60
                ),
                UserPrediction(
                    user_id=UUID('ff68456d-2b16-4fff-b1fb-041210ec6e9f'),
                    stake=30,
                    predicted_price_change=1,
                    predicted_tx_count=20000
                ),
            ],
            actual_price_change=100,
            actual_tx_count=50,
            block_id=None,
        )

        # Инициализация сервиса
        service = RewardDistributionService()

        # Расчёт наград
        result = await service.calculate_rewards(prediction)

        # Вывод наград для каждого пользователя
        for user_reward in result.user_rewards:
            print(f"Пользователь {user_reward.user_id} получает награду: {user_reward.reward:.2f}")


    # Запуск асинхронной функции
    asyncio.run(main())
