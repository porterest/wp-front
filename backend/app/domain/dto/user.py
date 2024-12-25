from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from domain.dto import CreateDTO




@dataclass
class CreateUserDTO(CreateDTO):
    telegram_id: int
    username: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    last_activity: Optional[datetime]
    wallet_address: Optional[str]


class UpdateUserDTO(BaseModel):
    telegram_id: Optional[int] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    last_activity: Optional[datetime] = None
    wallet_address: Optional[str] = None
    balances: Optional[float] = None
    bets: Optional[dict] = None
    transactions: Optional[dict] = None
    deposit: Optional[float] = None
    balance: Optional[float] = None

