from dataclasses import dataclass, field
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from domain.dto import CreateDTO
from domain.enums.deposit import DepositEntryStatus


@dataclass(kw_only=True)
class DepositEntryCreateDTO(CreateDTO):
    app_wallet_id: UUID
    user_id: UUID
    status: DepositEntryStatus = field(default=DepositEntryStatus.PENDING)
    amount: Optional[float] = None
    tx_id: Optional[UUID] = None


class DepositEntryUpdateDTO(BaseModel):
    status: Optional[DepositEntryStatus] = None
    amount: Optional[float] = None
    tx_id: Optional[UUID] = None
