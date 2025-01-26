from abc import ABC, abstractmethod

from domain.models.prediction import Prediction
from domain.models.reward_model import Rewards


class RewardDistributionServiceInterface(ABC):

    @abstractmethod
    async def calculate_rewards(self, prediction: Prediction) -> Rewards:
        """
        Распределяет вознаграждения среди пользователей на основе их предсказаний.
        :param prediction: DTO с предсказаниями пользователей и фактическими данными.
        :return: Словарь с вознаграждениями пользователей.
        """
        ...
