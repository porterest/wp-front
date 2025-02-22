from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from domain.metaholder.enums import BetStatus
from domain.models.bet import BetVector  # domain TypeVar could be used in metaholder cause it's a built-in type anyway


class BetResponse(BaseModel):
    id: UUID
    amount: float
    vector: BetVector
    pair_name: str
    status: BetStatus
    created_at: datetime
    accuracy: Optional[float] = None
    reward: Optional[float] = None
