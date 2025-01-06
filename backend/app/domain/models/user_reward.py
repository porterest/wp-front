from dataclasses import dataclass


@dataclass(kw_only=True)
class UserReward:
    user_id: str
    reward: float
    accuracy: float
