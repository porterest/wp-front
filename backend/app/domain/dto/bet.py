from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from domain.dto import CreateDTO
from domain.enums import BetStatus
from domain.models.bet import BetVector


@dataclass
class CreateBetDTO(CreateDTO):
    user_id: UUID
    pair_id: UUID
    amount: float
    block_id: UUID
    vector: BetVector
    status: BetStatus = BetStatus.PENDING


class UpdateBetDTO(BaseModel):
    status: Optional[BetStatus] = None
    reward: Optional[float]
    accuracy: Optional[float]
