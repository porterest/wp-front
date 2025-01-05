from dataclasses import dataclass


@dataclass(kw_only=True)
class UserPrediction:
    user_id: str
    stake: float
    predicted_price_change: float
    predicted_tx_count: int
