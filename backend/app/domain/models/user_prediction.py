from dataclasses import dataclass
from uuid import UUID


@dataclass(kw_only=True)
class UserPrediction:
    user_id: UUID
    stake: float
    predicted_price_change: float
    predicted_tx_count: int
