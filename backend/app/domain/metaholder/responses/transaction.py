from typing import Optional

from pydantic import BaseModel

from domain.enums import TransactionType


class TransactionResponse(BaseModel):
    type: TransactionType
    sender: str
    recipient: str
    amount: float

    tx_id: Optional[str] = None  # would be presented if type is external deposit/withdraw
