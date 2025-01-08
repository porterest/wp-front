from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from domain.dto import CreateDTO
from domain.enums import TransactionType


@dataclass(kw_only=True)
class CreateTransactionDTO(CreateDTO):
    user_id: Optional[UUID] = None
    type: TransactionType
    amount: float
    sender: str
    recipient: str
    tx_id: Optional[str] = None


class UpdateTransactionDTO(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[float] = None

    tx_id: Optional[str] = None
