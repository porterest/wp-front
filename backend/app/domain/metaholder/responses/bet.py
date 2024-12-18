from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class BetResponse(BaseModel):
    amount: float
    vector: tuple[float, float]
    pair_name: str
    created_at: datetime
