import logging
from typing import Optional

from fastapi import APIRouter

from dependencies.services.candle import get_candle_service
from domain.metaholder.responses.candle import Candle

router = APIRouter(
    prefix="/candles",
    tags=["Candles"]
)
logger = logging.getLogger(__name__)

@router.get('')
async def get_candles(pair_id: str, n: int) -> Optional[list[Candle]]:
    service = get_candle_service()
    blocks = await service.get_n_last_blocks_by_pair_id(pair_id=pair_id, n=n)
    logger.info("blocks!!!")
    logger.info(blocks)
    candles = []
    for block in blocks:
        volume = sum([bet.amount for bet in block.bets])
        bet_prices = [bet.vector[0] for bet in block.bets]
        if not bet_prices and volume == 0:
            return
        low_price = min(bet_prices)
        high_price = max(bet_prices)

        candle = Candle(
            opening_price=block.bets[0].vector[0],
            closing_price=block.bets[-1].vector[0],
            high_price=high_price,
            low_price=low_price,
            volume=volume,
            block_number=block.block_number,
        )
        candles.append(candle)
    logger.info("candles")
    logger.info(candles)
    return candles
