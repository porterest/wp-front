from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List, Tuple

from domain.enums.block_status import BlockStatus
from domain.models.bet import Bet, BetVector
from domain.models.base import BaseModel


@dataclass(kw_only=True)
class Block(BaseModel):
    block_number: int
    status: BlockStatus
    created_at: Optional[datetime]
    completed_at: Optional[datetime]
    result_vector: Optional[BetVector] = None
    bets: Optional[List[Bet]] = None