from dataclasses import dataclass
from typing import Optional

from domain.dto import CreateDTO
from domain.enums import TransactionType


@dataclass
class CreateTransactionDTO(CreateDTO):
    user_id: int
    type: TransactionType
    amount: float

    tx_id: Optional[str] = None


@dataclass
class UpdateTransactionDTO:
    type: Optional[TransactionType] = None
    amount: Optional[float] = None

    tx_id: Optional[str] = None
