from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from domain.enums import TransactionType
from domain.models.base import BaseModel


@dataclass
class Transaction(BaseModel):
    user_id: UUID
    type: TransactionType
    amount: float
    sender: str
    recipient: str
    tx_id: Optional[str] = None  # would be presented if type is external

