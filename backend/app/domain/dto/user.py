from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Mapped

from domain.dto import CreateDTO


@dataclass
class CreateUserDTO(CreateDTO):
    telegram_id: int
    username: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    last_activity: Optional[datetime]


@dataclass
class UpdateUserDTO:
    telegram_id: Optional[int] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    last_activity: Optional[datetime] = None
    wallet_address: Mapped[Optional[str]]  = None
    balances: Mapped[Optional[float]] = None
    bets: Mapped[Optional[dict]] = None
    transactions: Mapped[Optional[dict]] = None
    deposit: Mapped[Optional[float]] = None
    balance: Mapped[float] = None

