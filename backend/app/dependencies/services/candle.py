from abstractions.services.candle import CandleServiceInterface
from dependencies.services.block import get_block_service
from services.candle import CandleService


def get_candle_service() -> CandleServiceInterface:
    return CandleService(block_service=get_block_service())
