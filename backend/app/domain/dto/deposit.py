from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from domain.dto import CreateDTO
from domain.enums.deposit import DepositEntryStatus


@dataclass
class DepositEntryCreateDTO(CreateDTO):
    app_wallet_id: UUID
    tx_tag: str
    status: DepositEntryStatus

    amount: Optional[float]
    tx_id: Optional[str]


@dataclass
class DepositEntryUpdateDTO:
    status: Optional[DepositEntryStatus] = None

    amount: Optional[float] = None
    tx_id: Optional[str] = None
