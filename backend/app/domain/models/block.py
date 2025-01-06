from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from domain.enums.block_status import BlockStatus
from domain.models.base import BaseModel
from domain.models.bet import Bet, BetVector


@dataclass(kw_only=True)
class Block(BaseModel):
    block_number: int
    chain_id: UUID
    status: BlockStatus
    completed_at: Optional[datetime] = None
    result_vector: Optional[BetVector] = None
    bets: Optional[List[Bet]] = None
