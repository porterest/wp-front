from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from domain.dto import CreateDTO
from domain.dto.user_prediction import UpdateUserPredictionDTO, CreateUserPredictionDTO


@dataclass
class CreatePredictionDTO(CreateDTO):
    user_predictions: List[CreateUserPredictionDTO]
    actual_price_change: float
    actual_tx_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

@dataclass
class UpdatePredictionDTO(BaseModel):
    user_predictions: Optional[List[UpdateUserPredictionDTO]] = None
    actual_price_change: Optional[float] = None
    actual_tx_count: Optional[int] = None
    updated_at: Optional[datetime] = None
