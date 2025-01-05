from dataclasses import dataclass

from domain.models.base import BaseModel


@dataclass(kw_only=True)
class UserReward(BaseModel):
    user_id: str
    reward: float
    accuracy: float
