from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel

from domain.dto import CreateDTO


@dataclass
class CreateUserPredictionDTO(CreateDTO):
    user_id: str
    stake: float
    predicted_price_change: float
    predicted_tx_count: int


@dataclass
class UpdateUserPredictionDTO(BaseModel):
    user_id: Optional[str] = None
    stake: Optional[float] = None
    predicted_price_change: Optional[float] = None
    predicted_tx_count: Optional[int] = None
