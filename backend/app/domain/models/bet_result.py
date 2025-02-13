from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from domain.enums import BetStatus


@dataclass(kw_only=True)
class BetResult(BaseModel):
    id: UUID
    amount: float
    pair_name: str
    status: BetStatus
    reward: Optional[float]
    accuracy: Optional[float]
    created_at: datetime
