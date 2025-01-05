from abc import ABC, abstractmethod
from dataclasses import dataclass

from domain.models.prediction import Prediction


class RewardDistributionServiceInterface(ABC):
    @abstractmethod
    def calculate_accuracy_coefficient(self, predicted: float, actual: float) -> float:
        """
        Рассчитывает коэффициент точности предсказания.
        :param predicted: Предсказанное значение.
        :param actual: Фактическое значение.
        :return: Коэффициент точности (значение от 0 до 1).
        """
        ...

    @abstractmethod
    def determine_reward_pool(self, total_stake: float) -> float:
        """
        Определяет пул вознаграждений исходя из общего депозита и множителя выигрыша.
        :param total_stake: Общая сумма ставок всех пользователей.
        :return: Размер пула вознаграждений.
        """
        ...

    @abstractmethod
    def distribute_rewards(self, prediction: Prediction) -> dict:
        """
        Распределяет вознаграждения среди пользователей на основе их предсказаний.
        :param prediction: DTO с предсказаниями пользователей и фактическими данными.
        :return: Словарь с вознаграждениями пользователей.
        """
        ...

    @abstractmethod
    def distribute_rewards(self, prediction: Prediction) -> dict:
        ...
