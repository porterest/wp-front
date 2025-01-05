from abc import ABC
from dataclasses import dataclass

from domain.dto.prediction import CreatePredictionDTO

@dataclass
class LiquidityPredictionServiceInterface(ABC):
    """
    Сервис предсказания ликвидности
    """

    @staticmethod
    def calculate_prediction(create_prediction_dto: CreatePredictionDTO) -> float:
        """
        Рассчитывает итоговое предсказание цены на основе ставок и предсказаний пользователей.

        :param create_prediction_dto: DTO, содержащий список пользовательских предсказаний и мета-данные.
        :return: Итоговое предсказание изменения цены.
        """
        ...
