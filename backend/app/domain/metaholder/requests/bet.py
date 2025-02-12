from uuid import UUID

from pydantic import BaseModel


class PlaceBetRequest(BaseModel):
    pair_id: UUID
    amount: float
    predicted_vector: tuple[float, float]


class CancelBetRequest(BaseModel):
    # user_id: UUID
    bet_id: UUID
