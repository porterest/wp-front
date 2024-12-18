from dataclasses import dataclass
from typing import Optional

from domain.dto import CreateDTO


@dataclass
class CreateBalanceDTO(CreateDTO):
    user_id: int
    balance: float
    token_type: str


@dataclass
class UpdateBalanceDTO:
    balance: Optional[float] = None
    token_type: Optional[str] = None
