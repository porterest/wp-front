from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from domain.enums import BetStatus


@dataclass(kw_only=True)
class BetResult(BaseModel):
    id: UUID
    amount: float
    pair_name: str
    status: BetStatus
    reward: float
    accuracy: float
    created_at: datetime
