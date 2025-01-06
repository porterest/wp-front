from dataclasses import dataclass
from typing import List
from uuid import UUID

from domain.models.user_prediction import UserPrediction


@dataclass(kw_only=True)
class Prediction:
    user_predictions: List[UserPrediction]
    actual_price_change: float
    actual_tx_count: int

    block_id: UUID
