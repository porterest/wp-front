from dataclasses import dataclass
from uuid import UUID


@dataclass(kw_only=True)
class UserReward:
    user_id: UUID
    reward: float
    accuracy: float
