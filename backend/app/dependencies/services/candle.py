from abstractions.services.candle import CandleServiceInterface
from services.candle import CandleService


def get_candle_service() -> CandleServiceInterface:
    return CandleService()
