from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class TonTransactionStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


class TonTransaction(BaseModel):
    from_address: str
    to_address: str
    amount: int
    token: str
    sent_at: datetime
    status: TonTransactionStatus
    tx_id: Optional[str] = None
