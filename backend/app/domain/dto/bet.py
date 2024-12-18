from dataclasses import dataclass
from typing import Optional

from domain.dto import CreateDTO
from domain.enums import BetStatus


@dataclass
class CreateBetDTO(CreateDTO):
    user_id: int
    pair_id: int
    amount: float
    block_number: int
    vector: dict
    status: BetStatus = BetStatus.PENDING


@dataclass
class UpdateBetDTO:
    status: Optional[BetStatus] = None
