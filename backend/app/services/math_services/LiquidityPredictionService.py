from typing import List
from math import log10

from domain.dto.prediction import CreatePredictionDTO, CreateUserPredictionDTO

class LiquidityPredictionService:
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
        user_predictions = create_prediction_dto.user_predictions

        if not user_predictions:
            raise ValueError("Список предсказаний пользователей пуст")

        # Вычисляем веса ставок
        weights = [
            log10(user_prediction.stake + 1)
            for user_prediction in user_predictions
        ]

        # Вычисляем взвешенную сумму предсказаний
        total_weighted_prediction = sum(
            weight * user_prediction.predicted_price_change
            for weight, user_prediction in zip(weights, user_predictions)
        )

        # Сумма всех весов
        total_weight = sum(weights)

        # Итоговое предсказание
        return total_weighted_prediction / total_weight if total_weight > 0 else 0.0
