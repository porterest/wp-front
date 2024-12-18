from dataclasses import dataclass
from typing import Optional

from domain.enums import TransactionType
from domain.models.base import BaseModel


@dataclass
class Transaction(BaseModel):
    user_id: int
    type: TransactionType
    amount: float

    tx_id: Optional[str] = None  # would be presented if type is external
