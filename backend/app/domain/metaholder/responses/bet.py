from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from domain.metaholder.enums import BetStatus
from domain.models.bet import BetVector  # domain TypeVar could be used in metaholder cause it's a built-in type anyway


class BetResponse(BaseModel):
    id: UUID
    amount: float
    vector: BetVector  # tuple[float, float]
    pair_name: str
    status: BetStatus
    created_at: datetime
