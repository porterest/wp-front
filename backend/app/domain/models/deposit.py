from dataclasses import dataclass
from typing import Optional

from domain.enums.deposit import DepositEntryStatus
from domain.models import AppWallet
from domain.models.base import BaseModel


@dataclass
class DepositEntry(BaseModel):
    id: str
    app_wallet_id: str
    user_id: str
    tx_tag: str
    status: DepositEntryStatus

    amount: Optional[float] = None
    tx_id: Optional[str] = None

    transaction_id: Mapped[Optional[pyUUID]] = mapped_column(ForeignKey('transactions.id'), nullable=True)

    app_wallet = relationship("AppWallet", back_populates="deposits")
    user = relationship('User', back_populates='deposits')
    transaction = relationship('Transaction')
