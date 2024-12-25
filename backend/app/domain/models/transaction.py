import typing
from dataclasses import dataclass
from typing import Optional

from domain.enums import TransactionType
from domain.models.base import BaseModel

if typing.TYPE_CHECKING:
    from domain.models.user import User


@dataclass(kw_only=True)
class Transaction(BaseModel):
    type: TransactionType
    amount: float

    sender: str
    recipient: str

    tx_id: Optional[str] = None  # would be presented if type is external

    user: Optional['User'] = None
