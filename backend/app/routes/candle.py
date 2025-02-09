import logging
from typing import Optional

from fastapi import APIRouter

from dependencies.services.candle import get_candle_service
from domain.metaholder.responses.candle import Candle
from domain.models.block import Block

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
    prev_block: Optional[Block] = None
    for block in blocks:
        volume = sum([bet.amount for bet in block.bets])
        bet_prices = [bet.vector[0] for bet in block.bets]
        if not bet_prices and volume == 0:
            low_price = 0
            high_price = 0
        else:
            low_price = min(bet_prices)
            high_price = max(bet_prices)

        candle = Candle(
            opening_price=prev_block.result_vector[0] if prev_block else 0,
            closing_price=block.result_vector[0],
            high_price=high_price,
            low_price=low_price,
            volume=volume,
            block_number=block.block_number,
        )
        candles.append(candle)
        prev_block = block

    logger.info("candles")
    logger.info(candles)
    return candles
