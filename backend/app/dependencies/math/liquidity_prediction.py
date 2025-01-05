from abstractions.services.math.liquidity_prediction import LiquidityPredictionServiceInterface
from services.math_services.LiquidityManager import LiquidityPredictionService


def get_pair_service() -> LiquidityPredictionServiceInterface:
    return LiquidityPredictionService()