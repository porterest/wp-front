import typing
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from domain.enums.deposit import DepositEntryStatus
from domain.models import AppWallet
from domain.models.base import BaseModel

if typing.TYPE_CHECKING:
    from domain.models.app_wallet import AppWallet
    from domain.models.user import User
    from domain.models.transaction import Transaction


@dataclass(kw_only=True)
class DepositEntry(BaseModel):
    app_wallet_id: UUID
    user_id: UUID
    status: DepositEntryStatus
    amount: Optional[float] = None
    tx_id: Optional[UUID] = None
