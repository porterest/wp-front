from typing import List
from uuid import UUID

from pydantic import BaseModel


class PlaceBetRequest(BaseModel):
    user_id: UUID
    pair_id: UUID
    amount: float
    predicted_vector: List[float]


class CancelBetRequest(BaseModel):
    user_id: UUID
    bet_id: UUID
