from datetime import datetime

from domain.dto.prediction import CreatePredictionDTO
from domain.dto.user_prediction import CreateUserPredictionDTO


class RewardDistributionService:
    def __init__(self, wallet_balance: float, reward_multiplier: float = 1.4):
        """
        Инициализация сервиса распределения вознаграждений.
        :param wallet_balance: Баланс кошелька системы.
        :param reward_multiplier: Множитель для определения максимального выигрыша (по умолчанию 1.5).
        """
        self.wallet_balance = wallet_balance
        self.reward_multiplier = reward_multiplier

    def calculate_accuracy_coefficient(self, predicted: float, actual: float) -> float:
        """
        Рассчитывает коэффициент точности предсказания.
        :param predicted: Предсказанное значение.
        :param actual: Фактическое значение.
        :return: Коэффициент точности (значение от 0 до 1).
        """
        if actual == 0:
            return 0
        return max(0, 1 - abs(predicted - actual) / abs(actual))

    def determine_reward_pool(self, total_stake: float) -> float:
        """
        Определяет пул вознаграждений исходя из общего депозита и множителя выигрыша.
        :param total_stake: Общая сумма ставок всех пользователей.
        :return: Размер пула вознаграждений.
        """
        max_possible_reward = total_stake * self.reward_multiplier
        return min(self.wallet_balance, max_possible_reward)

    def distribute_rewards(self, prediction: CreatePredictionDTO) -> dict:
        """
        Распределяет вознаграждения среди пользователей на основе их предсказаний.
        :param prediction: DTO с предсказаниями пользователей и фактическими данными.
        :return: Словарь с вознаграждениями пользователей.
        """
        total_accuracy = 0
        user_accuracies = {}
        total_stake = sum(user_prediction.stake for user_prediction in prediction.user_predictions)

        # Рассчитываем коэффициенты точности для каждого пользователя
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
            raise ValueError("Нет достаточной точности для распределения вознаграждений.")

        # Определяем общий пул вознаграждений
        reward_pool = self.determine_reward_pool(total_stake)

        # Распределяем вознаграждения
        rewards = {}
        for user_prediction in prediction.user_predictions:
            user_id = user_prediction.user_id
            user_accuracy = user_accuracies[user_id] * user_prediction.stake
            user_reward = reward_pool * (user_accuracy / total_accuracy)
            rewards[user_id] = user_reward

        # Обновляем баланс кошелька
        self.wallet_balance -= reward_pool

        return rewards


# Пример использования
if __name__ == "__main__":
    service = RewardDistributionService(wallet_balance=1000.0)

    prediction = CreatePredictionDTO(
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
        created_at=datetime.now(),
        updated_at=None
    )

    rewards = service.distribute_rewards(prediction)

    for user_id, reward in rewards.items():
        print(f"User {user_id} receives reward: {reward:.2f}")
