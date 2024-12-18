from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List, Tuple
from domain.models.bet import Bet
from domain.models.base import BaseModel


@dataclass(kw_only=True)
class Block(BaseModel):
    block_number: int
    status: str
    created_at: Optional[datetime]
    completed_at: Optional[datetime]
    result_vector: Optional[Tuple[float, float]] = None
    bets: Optional[List[Bet]] = None
