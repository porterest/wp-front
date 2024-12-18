from dataclasses import dataclass
from uuid import UUID

from domain.enums import BetStatus
from domain.models import Pair
from domain.models.base import BaseModel


@dataclass
class Bet(BaseModel):
    user_id: UUID
    pair: Pair
    amount: float
    block_number: int
    vector: tuple[float, float]
    status: BetStatus
