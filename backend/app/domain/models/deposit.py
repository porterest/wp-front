from dataclasses import dataclass
from typing import Optional

from domain.enums.deposit import DepositEntryStatus
from domain.models import AppWallet
from domain.models.base import BaseModel


@dataclass
class DepositEntry(BaseModel):
    app_wallet: AppWallet
    tx_tag: str
    status: DepositEntryStatus

    amount: Optional[float] = None
    tx_id: Optional[str] = None
