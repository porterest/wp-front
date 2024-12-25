from datetime import datetime

from pydantic import BaseModel

from domain.models.bet import BetVector


class BetResponse(BaseModel):
    amount: float
    vector: BetVector  #tuple[float, float]
    pair_name: str
    created_at: datetime
