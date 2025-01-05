from dataclasses import dataclass

from abstractions.services.math.reward_distribution import RewardDistributionServiceInterface
from domain.dto.user_prediction import CreateUserPredictionDTO
from domain.models.prediction import Prediction
from domain.models.reward_model import RewardsModel


@dataclass
class RewardDistributionService(RewardDistributionServiceInterface):
    reward_multiplier: float = 1.4

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
        return max(0, 1 - abs(predicted - actual) / abs(actual))

    def distribute_rewards(self, prediction: Prediction) -> RewardsModel:
        """
        Рассчитывает награды пользователей.
        :param prediction: DTO с предсказаниями пользователей и фактическими данными.
        :return: Словарь с наградами для каждого пользователя.
        """
        total_accuracy = 0
        user_accuracies = {}
        total_stake = sum(user_prediction.stake for user_prediction in prediction.user_predictions)

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
        rewards = {}
        reward_pool = total_stake * self.reward_multiplier
        for user_prediction in prediction.user_predictions:
            user_id = user_prediction.user_id
            user_accuracy = user_accuracies[user_id] * user_prediction.stake
            user_reward = reward_pool * (user_accuracy / total_accuracy)
            rewards[user_id] = user_reward

        return RewardsModel(total_reward_pool=reward_pool, user_rewards=rewards)


# Пример использования
if __name__ == "__main__":
    prediction = Prediction(
        user_predictions=[
            CreateUserPredictionDTO(
                user_id='user_1',
                stake=100,
                predicted_price_change=95,
                predicted_tx_count=55
            ),
            CreateUserPredictionDTO(
                user_id='user_2',
                stake=200,
                predicted_price_change=110,
                predicted_tx_count=60
            ),
            CreateUserPredictionDTO(
                user_id='user_3',
                stake=300,
                predicted_price_change=80,
                predicted_tx_count=30
            ),
        ],
        actual_price_change=100,
        actual_tx_count=50,
    )

    service = RewardDistributionService()
    result = service.distribute_rewards(prediction)
    for user_id, reward in result["rewards"].items():
        print(f"Пользователь {user_id} получает награду: {reward:.2f}")
